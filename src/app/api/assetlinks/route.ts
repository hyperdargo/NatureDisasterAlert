import { NextResponse } from "next/server";

/**
 * Digital Asset Links, served at /.well-known/assetlinks.json via a rewrite.
 *
 * This is what tells Android that this website and the signed APK belong to
 * the same owner. Without it the Trusted Web Activity still runs, but Chrome
 * keeps a URL bar pinned to the top of the screen and the result reads as a
 * browser rather than an app. With it, the app opens full screen.
 *
 * The fingerprint is the SHA-256 of the certificate the APK was signed with.
 * It is not a secret - it is a public identifier, and it must match exactly or
 * verification fails silently.
 */
const PACKAGE_NAME = process.env.TWA_PACKAGE_NAME ?? "np.com.ankitgupta.disasteralert";

/**
 * SHA-256 of the certificate in android/android.keystore.
 *
 * This is a public identifier, not a secret: it is the whole point of the file
 * that anyone can fetch it and check it against the installed APK. The private
 * key it identifies is the thing that must stay out of the repository.
 *
 * Regenerate with:
 *   keytool -list -v -keystore android/android.keystore -alias disasteralert
 *
 * If the app is ever re-signed with a different key, this must change or the
 * URL bar silently reappears in the installed app.
 */
const DEFAULT_FINGERPRINT =
  "21:3D:ED:F2:E6:96:8B:5C:B0:6E:E1:BE:5A:65:67:26:3A:EB:09:EF:12:73:D7:C3:06:EF:55:33:71:62:F1:DF";

const FINGERPRINT = process.env.TWA_SHA256_FINGERPRINT ?? DEFAULT_FINGERPRINT;

export const dynamic = "force-static";

export async function GET() {
  if (!FINGERPRINT) {
    // Better to serve an empty list than a malformed entry: Chrome treats a
    // broken file the same as a missing one, but an empty list is honest.
    return NextResponse.json([], {
      headers: { "cache-control": "public, max-age=300" },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: [FINGERPRINT],
        },
      },
    ],
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600",
      },
    },
  );
}
