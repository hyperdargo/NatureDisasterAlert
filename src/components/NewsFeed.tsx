"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, Newspaper } from "@phosphor-icons/react/dist/ssr";
import { relativeTime } from "@/lib/display";

/**
 * Press coverage of Nepal disasters.
 *
 * Deliberately presented as a separate feed rather than attached to individual
 * incidents. The underlying source is a keyword search over world media, which
 * can tell us an article mentions a flood in Nepal but cannot tell us it is
 * about the landslide logged in Sindhupalchok on Tuesday. Bolting a headline
 * onto an incident would assert a link nobody verified, so the heading says
 * what this actually is.
 */
export interface NewsArticle {
  title: string;
  url: string;
  outlet: string;
  publishedAt: string;
  imageUrl: string | null;
}

export function NewsFeed({ now }: { now: number }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [state, setState] = useState<"loading" | "done" | "empty">("loading");

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const load = async (attempt: number) => {
      try {
        const response = await fetch("/api/news");
        const data = (await response.json()) as {
          articles?: NewsArticle[];
          warming?: boolean;
        };
        if (cancelled) return;

        const found = data.articles ?? [];
        if (found.length > 0) {
          setArticles(found);
          setState("done");
          return;
        }

        // The server fetches news in the background because the upstream takes
        // around 15 seconds. On a cold start the first copy is still on its
        // way, so check back once before giving up.
        if (data.warming && attempt < 2) {
          retry = setTimeout(() => void load(attempt + 1), 20_000);
          return;
        }
        setState("empty");
      } catch (error) {
        console.error("news failed:", error);
        if (!cancelled) setState("empty");
      }
    };

    void load(0);
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, []);

  // Supplementary content: if it is unavailable, say nothing rather than
  // occupying the page with an error about something nobody asked for.
  if (state === "empty") return null;

  return (
    <section aria-labelledby="press-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="press-heading"
          className="flex items-center gap-1.5 text-sm font-medium text-ink"
        >
          <Newspaper size={15} weight="duotone" aria-hidden />
          In the news
        </h2>
        <p className="text-xs text-ink-secondary">
          Coverage of Nepal disasters, not tied to a specific incident above
        </p>
      </div>

      {state === "loading" ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <li
              key={key}
              className="animate-pulse rounded-lg border border-edge bg-surface p-4"
            >
              <div className="h-3 w-24 rounded bg-grid" />
              <div className="mt-3 h-3.5 w-full rounded bg-grid" />
              <div className="mt-2 h-3.5 w-4/5 rounded bg-grid" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <li key={article.url}>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col rounded-lg border border-edge bg-surface p-4 transition-colors hover:border-edge-strong"
              >
                <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <span className="truncate font-medium">{article.outlet}</span>
                  <span aria-hidden>·</span>
                  <span className="whitespace-nowrap">
                    {relativeTime(article.publishedAt, now)}
                  </span>
                </p>
                <p className="mt-2 flex-1 text-sm leading-snug text-ink">
                  {article.title}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-secondary">
                  Read at {article.outlet}
                  <ArrowSquareOut size={11} aria-hidden />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
