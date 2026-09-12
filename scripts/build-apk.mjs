/**
 * Build, sign and publish the Android APK.
 *
 *   npm run apk
 *
 * This produces the packaged app: the entire interface is compiled to static
 * files and shipped inside the APK, so it opens from local storage rather than
 * downloading the site on every launch. Only hazard data crosses the network,
 * from the deployed site, because that data is live.
 *
 * Steps: build the static shell, copy it into the native project, compile,
 * align, sign, verify. The result lands in public/app/, which is the real
 * distribution path because this repository is private and GitHub release
 * assets on a private repository return 404 to anyone not signed in.
 *
 * Requires android-capacitor/../android/signing-key.env, which is deliberately
 * not in the repository. Without the original key you cannot ship an upgrade
 * to anyone who already installed the app.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nativeDir = join(root, "android-capacitor");
const keysDir = join(root, "android");
const home = process.env.USERPROFILE ?? process.env.HOME ?? "";

// Capacitor 8 compiles against Java 21; JDK 17 fails with
// "invalid source release: 21".
const JAVA_HOME =
  process.env.JAVA_HOME_21 ?? join(home, ".bubblewrap", "jdk21", "jdk-21.0.12.1+1");
const ANDROID_HOME = process.env.ANDROID_HOME ?? join(home, ".bubblewrap", "android_sdk");
const BUILD_TOOLS = process.env.ANDROID_BUILD_TOOLS ?? "36.0.0";

const isWindows = process.platform === "win32";
const buildToolsDir = join(ANDROID_HOME, "build-tools", BUILD_TOOLS);
const zipalign = join(buildToolsDir, isWindows ? "zipalign.exe" : "zipalign");
const apksigner = join(buildToolsDir, `apksigner${isWindows ? ".bat" : ""}`);

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!existsSync(JAVA_HOME)) fail(`JDK 17 not found at ${JAVA_HOME}. Set JAVA_HOME_17.`);
if (!existsSync(buildToolsDir)) {
  fail(`Android build-tools ${BUILD_TOOLS} not found at ${buildToolsDir}.`);
}
if (!existsSync(nativeDir)) {
  fail("android-capacitor/ is missing. Run: npx cap add android");
}

const envPath = join(keysDir, "signing-key.env");
if (!existsSync(envPath)) {
  fail(
    "android/signing-key.env is missing. It holds the keystore password and is " +
      "not in the repository by design. Restore it from your backup.",
  );
}

/** Parse the KEY=value file without pulling in a dependency. */
const signing = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
for (const key of ["KEYSTORE_PASSWORD", "KEY_PASSWORD", "KEY_ALIAS"]) {
  if (!signing[key]) fail(`${key} missing from android/signing-key.env`);
}

const env = {
  ...process.env,
  JAVA_HOME,
  ANDROID_HOME,
  ANDROID_SDK_ROOT: ANDROID_HOME,
};

/**
 * `shell: true` is needed on Windows for .bat and .cmd wrappers, but it also
 * means the command string is not quoted. An absolute path containing a space,
 * such as "C:\Program Files\nodejs\node.exe", is then split at the
 * space and fails. Anything invoked by absolute path runs without the shell.
 */
const run = (command, args, cwd, useShell = isWindows) =>
  execFileSync(command, args, { cwd, env, stdio: "inherit", shell: useShell });

console.log("\n> 1/5 Building the static interface\n");
run(process.execPath, [join(root, "scripts", "build-app-shell.mjs")], root, false);

console.log("\n> 2/5 Copying it into the native project\n");
run(isWindows ? "npx.cmd" : "npx", ["cap", "sync", "android"], root);

console.log("\n> 3/5 Compiling\n");
// An absolute path: Windows does not resolve a bare "gradlew.bat" from the
// working directory unless it is on PATH.
const gradlew = join(nativeDir, isWindows ? "gradlew.bat" : "gradlew");
run(gradlew, ["assembleRelease", "--no-daemon"], nativeDir);

const releaseDir = join(nativeDir, "app", "build", "outputs", "apk", "release");
const unsigned = join(releaseDir, "app-release-unsigned.apk");
if (!existsSync(unsigned)) fail(`Gradle produced no APK at ${unsigned}`);

const aligned = join(releaseDir, "app-release-aligned.apk");
console.log("\n> 4/5 Aligning\n");
// -p page-aligns uncompressed native libraries; -f overwrites.
run(zipalign, ["-p", "-f", "4", unsigned, aligned], root, false);

// Written to dist/ rather than public/: the APK is distributed from the
// depot and attached to GitHub releases, not served by this site. Keeping it
// out of public/ also stops the static export embedding the APK inside the
// next APK.
const outDir = join(root, "dist");
mkdirSync(outDir, { recursive: true });
const signed = join(outDir, "nature-disaster-alert.apk");

console.log("\n> 5/5 Signing\n");
run(apksigner, [
  "sign",
  "--ks", join(keysDir, "android.keystore"),
  "--ks-key-alias", signing.KEY_ALIAS,
  "--ks-pass", `pass:${signing.KEYSTORE_PASSWORD}`,
  "--key-pass", `pass:${signing.KEY_PASSWORD}`,
  "--out", signed,
  aligned,
]);

// apksigner leaves a .idsig sidecar that is not needed to install.
const idsig = `${signed}.idsig`;
if (existsSync(idsig)) rmSync(idsig);

run(apksigner, ["verify", "--print-certs", signed]);

// The shell build deletes .next, since an export build left there would break
// the website deploy. Rebuild it so the working tree is ready to deploy.
console.log("\n> Restoring the server build\n");
run(isWindows ? "npm.cmd" : "npm", ["run", "build"], root);

const sha256 = createHash("sha256").update(readFileSync(signed)).digest("hex");
const mb = (statSync(signed).size / 1024 / 1024).toFixed(2);

console.log(`
  Built  dist/nature-disaster-alert.apk
  Size   ${mb} MB
  SHA256 ${sha256}

  Upload it to the depot so /install points at this build:
  https://depot.ankitgupta.com.np
`);
