import type { Metadata } from "next";
import Link from "next/link";
import {
  AndroidLogo,
  AppleLogo,
  ArrowSquareOut,
  DownloadSimple,
  Export,
  PlusSquare,
  WifiSlash,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Install the app",
  description:
    "Install Nature Disaster Alert on Android or iPhone. Free on both, with offline access and alerts for hazards near you.",
};

/**
 * Install instructions for both platforms.
 *
 * iPhone gets the same app as Android here, installed through Safari rather
 * than from a file. That is not a fallback or a lesser version: Apple charges
 * 99 US dollars a year for the developer programme that TestFlight and the App
 * Store both require, with no free tier for public distribution, so a web
 * install is the only route that costs a user nothing. Since iOS 16.4 a
 * home-screen web app can send notifications and work offline, which covers
 * what this app actually needs.
 */
const ANDROID_STEPS = [
  "Download the APK file below.",
  "Open it from your notifications or your Downloads folder.",
  "Android will ask whether to allow installing from this source. Tap Settings, turn the permission on, then go back.",
  "Tap Install, then Open.",
];

const IOS_STEPS = [
  "Open this page in Safari. Chrome and other browsers on iPhone cannot install it.",
  "Tap the Share button at the bottom of the screen.",
  "Scroll down and tap Add to Home Screen.",
  "Tap Add. The icon appears on your home screen like any other app.",
];

export default function InstallPage() {
  return (
    <>
        <div className="max-w-2xl">
          <h1 className="text-2xl leading-tight font-medium tracking-tight text-ink sm:text-3xl">
            Install the app
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Free on Android and iPhone. Once installed it opens full screen,
            keeps working when the network drops, and can alert you when a
            hazard is reported near you.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <section
            aria-labelledby="android-heading"
            className="rounded-lg border border-edge bg-surface p-5"
          >
            <h2
              id="android-heading"
              className="flex items-center gap-2 text-base font-medium text-ink"
            >
              <AndroidLogo size={20} weight="fill" aria-hidden />
              Android
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Install the app file directly. No Play Store account needed.
            </p>

            <a
              href="/app/nature-disaster-alert.apk"
              download
              className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-transparent bg-ink px-4 text-sm font-medium text-page transition-transform active:translate-y-px"
            >
              <DownloadSimple size={17} weight="bold" aria-hidden />
              Download for Android
            </a>

            <ol className="mt-4 space-y-2.5">
              {ANDROID_STEPS.map((step, index) => (
                <li key={step} className="flex gap-2.5 text-sm text-ink-secondary">
                  <span
                    className="tabular mt-px shrink-0 text-xs"
                    style={{ color: "var(--series-1)" }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <p className="mt-4 border-t border-edge pt-3 text-[11px] leading-relaxed text-ink-muted">
              The warning Android shows about installing outside the Play Store
              is normal for any app distributed this way. You can also just use
              the website, or tap the browser menu and choose Install app.
            </p>
          </section>

          <section
            aria-labelledby="ios-heading"
            className="rounded-lg border border-edge bg-surface p-5"
          >
            <h2
              id="ios-heading"
              className="flex items-center gap-2 text-base font-medium text-ink"
            >
              <AppleLogo size={20} weight="fill" aria-hidden />
              iPhone and iPad
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Install straight from Safari. Free, and no App Store account
              needed.
            </p>

            <ol className="mt-4 space-y-2.5">
              {IOS_STEPS.map((step, index) => (
                <li key={step} className="flex gap-2.5 text-sm text-ink-secondary">
                  <span
                    className="tabular mt-px shrink-0 text-xs"
                    style={{ color: "var(--series-1)" }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-edge p-3">
              <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <Export size={15} aria-hidden />
                Share
              </span>
              <span aria-hidden className="text-ink-muted">
                then
              </span>
              <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <PlusSquare size={15} aria-hidden />
                Add to Home Screen
              </span>
            </div>

            <p className="mt-4 border-t border-edge pt-3 text-[11px] leading-relaxed text-ink-muted">
              There is no free way to put an app on the iPhone App Store or
              TestFlight, both of which require a paid Apple developer
              membership. Installing from Safari gives you the same app at no
              cost, including alerts on iOS 16.4 and later.
            </p>
          </section>
        </div>

        <section className="mt-8 rounded-lg border border-edge bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
            <WifiSlash size={16} weight="duotone" aria-hidden />
            What you get once it is installed
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              "Opens full screen, without browser controls",
              "Keeps working when the network drops, showing the last update and saying it is offline",
              "Can alert you when a serious hazard is reported near you",
              "Hazard distances are worked out on your phone. Only the nearby-services search sends a position, rounded to about 1 km, and nothing is stored",
            ].map((item) => (
              <li
                key={item}
                className="border-t border-edge pt-2 text-sm text-ink-secondary"
              >
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink underline underline-offset-2"
          >
            Open the live map
            <ArrowSquareOut size={13} aria-hidden />
          </Link>
        </section>
    </>
  );
}
