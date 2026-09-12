/**
 * Where the browser should send API requests.
 *
 * On the website this is empty, so every call stays same-origin and relative.
 *
 * In the packaged Android app the UI is bundled into the APK and served by the
 * WebView from a local origin, so there is no server behind it. Those builds
 * set NEXT_PUBLIC_API_BASE to the deployed site, and every request becomes
 * cross-origin. That is why the API routes send CORS headers: the app is a
 * first-party client that happens to live on a different origin.
 *
 * The value is inlined at build time, so the web bundle carries no trace of it.
 */
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// A trailing slash here would produce "//api/events" and a redirect.
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

/** Build an API URL that works both same-origin and from the packaged app. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** True when running inside the packaged app rather than on the website. */
export const IS_PACKAGED_APP = API_BASE !== "";
