"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  AndroidLogo,
  AppleLogo,
  DownloadSimple,
  Export,
  PlusSquare,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { useBrowserStore } from "@/hooks/useBrowserState";
import { platformStore, dismissedStore, dismissInstallCard } from "@/lib/install-state";
import { usePwa } from "@/hooks/usePwa";
import { APK_DOWNLOAD_URL, APK_IS_LOCAL } from "@/lib/site";

/**
 * The install offer, shown on the live dashboard.
 *
 * Each platform gets only the route that actually works for it, because the
 * wrong instruction is worse than none:
 *
 *   Android  a direct APK download, plus Chrome's own install prompt when the
 *            browser offers one.
 *   iPhone   the Safari Add to Home Screen steps. An APK is meaningless here
 *            and offering one would just confuse people.
 *   Desktop  a QR code, since the thing being installed is a phone app and
 *            nobody wants to retype a URL.
 *
 * Hidden entirely once the app is already running from the home screen.
 */
export function InstallCard() {
  const platform = useBrowserStore(platformStore);
  const dismissed = useBrowserStore(dismissedStore);
  const pwa = usePwa();
  const [justDownloaded, setJustDownloaded] = useState(false);

  if (pwa.installed || dismissed) return null;

  return (
    <section
      aria-labelledby="install-heading"
      className="relative overflow-hidden rounded-lg border border-edge bg-surface"
    >
      <button
        type="button"
        onClick={dismissInstallCard}
        aria-label="Hide install offer"
        className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <X size={15} aria-hidden />
      </button>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <div className="min-w-0 flex-1">
          <h2 id="install-heading" className="text-base font-medium text-ink">
            Get alerts on your phone
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-secondary">
            {platform === "android" &&
              "Install the app to open it full screen, keep working when the network drops, and be alerted when a hazard is reported near you."}
            {platform === "ios" &&
              "Add it to your home screen to open it full screen, keep working when the network drops, and get alerts when a hazard is reported near you."}
            {platform === "other" &&
              "This is built for phones. Scan the code to open the install page on yours, free on Android and iPhone."}
          </p>

          {platform === "android" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={APK_DOWNLOAD_URL}
                {...(APK_IS_LOCAL
                  ? { download: "nature-disaster-alert.apk" }
                  : { target: "_blank", rel: "noopener noreferrer" })}
                onClick={() => setJustDownloaded(true)}
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-page transition-transform active:translate-y-px"
              >
                <DownloadSimple size={17} weight="bold" aria-hidden />
                Download the app
              </a>

              {pwa.canInstall && (
                <button
                  type="button"
                  onClick={() => void pwa.install()}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-edge px-4 text-sm text-ink transition-colors hover:border-edge-strong"
                >
                  <AndroidLogo size={17} aria-hidden />
                  Or install from browser
                </button>
              )}

              <Link
                href="/install"
                className="text-xs text-ink-secondary underline underline-offset-2 hover:text-ink"
              >
                Help
              </Link>
            </div>
          )}

          {platform === "android" && justDownloaded && (
            <p
              role="status"
              className="mt-3 rounded border border-edge bg-raised p-3 text-xs leading-relaxed text-ink-secondary"
            >
              Open the file from your notifications when it finishes. Android
              will ask whether to allow installing from this source; turn it
              on, go back, then tap Install. That warning is normal for any app
              not from the Play Store.
            </p>
          )}

          {platform === "ios" && (
            <ol className="mt-4 space-y-2">
              {[
                { icon: Export, text: "Tap the Share button in Safari" },
                { icon: PlusSquare, text: "Choose Add to Home Screen" },
              ].map((step, index) => (
                <li
                  key={step.text}
                  className="flex items-center gap-2.5 text-sm text-ink-secondary"
                >
                  <span
                    className="tabular shrink-0 text-xs"
                    style={{ color: "var(--series-1)" }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <step.icon size={16} className="shrink-0" aria-hidden />
                  {step.text}
                </li>
              ))}
            </ol>
          )}

          {platform === "other" && (
            <Link
              href="/install"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-edge px-4 text-sm text-ink transition-colors hover:border-edge-strong"
            >
              <AndroidLogo size={16} aria-hidden />
              <AppleLogo size={16} aria-hidden />
              Install instructions
            </Link>
          )}
        </div>

        {platform === "other" && (
          <div className="shrink-0 self-start sm:self-center">
            {/* Light chip behind the code so it scans in dark mode too. */}
            <div className="rounded-lg bg-white p-2.5">
              <Image
                src="/install-qr.png"
                alt="QR code linking to the install page"
                width={116}
                height={116}
                priority
                className="block h-[116px] w-[116px]"
              />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-ink-muted">
              Scan with your phone
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
