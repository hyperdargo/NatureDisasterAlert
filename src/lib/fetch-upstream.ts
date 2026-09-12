/**
 * Every outbound call to a third-party feed goes through here.
 *
 * Upstream feeds are untrusted input. A hung or hostile upstream must not be
 * able to hang our own request handler or hand us an unbounded body, so each
 * call carries a hard timeout and a response size ceiling.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_BYTES = 8 * 1024 * 1024;

export class UpstreamError extends Error {
  constructor(
    readonly source: string,
    message: string,
  ) {
    super(`[${source}] ${message}`);
    this.name = "UpstreamError";
  }
}

interface Options {
  source: string;
  /** Seconds Next.js may serve a cached copy before revalidating. */
  revalidate: number;
  timeoutMs?: number;
  accept?: string;
}

async function readCapped(res: Response, source: string): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) {
    throw new UpstreamError(source, `response too large (${declared} bytes)`);
  }
  const body = await res.text();
  if (body.length > MAX_BYTES) {
    throw new UpstreamError(source, "response exceeded size ceiling");
  }
  return body;
}

/**
 * Node's HTTP stack applies its own 10 second connect timeout, independent of
 * the abort signal below, and some of these feeds intermittently take longer
 * than that to complete a TLS handshake. That surfaces as a connect timeout on
 * a host that answers fine a second later, so transport-level failures are
 * retried once. An HTTP error status is never retried: a 404 or a 429 is an
 * answer, and hammering a rate-limited endpoint only makes it worse.
 */
const RETRYABLE =
  /UND_ERR_CONNECT_TIMEOUT|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|TimeoutError|aborted due to timeout/i;

function isTransient(error: unknown): boolean {
  if (error instanceof UpstreamError) return false;
  const cause = (error as { cause?: { code?: string } })?.cause;
  const asError = error as Error | undefined;
  const text = `${cause?.code ?? ""} ${asError?.name ?? ""} ${asError?.message ?? ""}`;
  return RETRYABLE.test(text);
}

/**
 * A one-line description of a failure.
 *
 * Logging a raw DOMException prints its entire constant table - two dozen
 * lines of INDEX_SIZE_ERR, HIERARCHY_REQUEST_ERR and friends - for every
 * timeout, which buries the one fact that matters in the server log.
 */
export function describeError(error: unknown): string {
  if (error instanceof UpstreamError) return error.message;
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    const code = cause?.code ? ` (${cause.code})` : "";
    return `${error.name}: ${error.message}${code}`;
  }
  return String(error);
}

async function request(url: string, opts: Options, attempt = 0): Promise<Response> {
  const signal = AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal,
      headers: {
        accept: opts.accept ?? "application/json",
        // Several of these feeds reject requests without a UA.
        "user-agent":
          "NatureDisasterAlert/0.1 (disaster early-warning; open source)",
      },
      next: { revalidate: opts.revalidate },
    });
  } catch (error) {
    if (attempt === 0 && isTransient(error)) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      return request(url, opts, attempt + 1);
    }
    throw error;
  }

  if (!res.ok) {
    throw new UpstreamError(opts.source, `HTTP ${res.status}`);
  }
  return res;
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: Options,
): Promise<T> {
  const res = await request(url, opts);
  const body = await readCapped(res, opts.source);
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new UpstreamError(opts.source, "response was not valid JSON");
  }
}

export async function fetchText(url: string, opts: Options): Promise<string> {
  // GDACS answers 406 to a narrow XML Accept header, so default to permissive.
  const res = await request(url, { ...opts, accept: opts.accept ?? "*/*" });
  return readCapped(res, opts.source);
}

/**
 * Run every source adapter concurrently and keep whatever succeeds.
 * One dead feed degrades the dashboard; it never blanks it.
 */
export async function gatherSources<T>(
  tasks: ReadonlyArray<{ name: string; run: () => Promise<T[]> }>,
): Promise<{ events: T[]; failed: string[] }> {
  const settled = await Promise.allSettled(tasks.map((t) => t.run()));
  const events: T[] = [];
  const failed: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      events.push(...result.value);
    } else {
      failed.push(tasks[i].name);
      console.error(`source "${tasks[i].name}" failed: ${describeError(result.reason)}`);
    }
  });
  return { events, failed };
}
