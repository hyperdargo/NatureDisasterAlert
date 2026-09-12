/**
 * Build, align, sign and publish the Android APK.
 *
 *   npm run apk
 *
 * The output lands in public/app/nature-disaster-alert.apk, which is what the
 * download button on /install serves. That copy is the real distribution
 * channel: the GitHub repository is private, so release assets there return
 * 404 to anyone not signed in and cannot be linked to users.
 *
 * Requires android/signing-key.env, which is deliberately not in the
 * repository. If you have lost it you cannot ship an upgrade to existing
 * installs; see the README.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "android");
const home = process.env.USERPROFILE ?? process.env.HOME ?? "";

const JAVA_HOME = process.env.JAVA_HOME_17 ?? join(home, ".bubblewrap", "jdk", "jdk-17.0.11+9");
const ANDROID_HOME = process.env.ANDROID_HOME ?? join(home, ".bubblewrap", "android_sdk");
const BUILD_TOOLS = process.env.ANDROID_BUILD_TOOLS ?? "36.0.0";

const isWindows = process.platform === "win32";
const ext = isWindows ? ".bat" : "";
const buildToolsDir = join(ANDROID_HOME, "build-tools", BUILD_TOOLS);
const zipalign = join(buildToolsDir, isWindows ? "zipalign.exe" : "zipalign");
const apksigner = join(buildToolsDir, `apksigner${ext}`);

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!existsSync(JAVA_HOME)) fail(`JDK 17 not found at ${JAVA_HOME}. Set JAVA_HOME_17.`);
if (!existsSync(buildToolsDir)) fail(`Android build-tools ${BUILD_TOOLS} not found at ${buildToolsDir}.`);

const envPath = join(androidDir, "signing-key.env");
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

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, env, stdio: "inherit", shell: isWindows });

console.log("\n> Building release APK\n");
run(isWindows ? "gradlew.bat" : "./gradlew", ["assembleRelease", "--no-daemon"], androidDir);

const releaseDir = join(androidDir, "app", "build", "outputs", "apk", "release");
const unsigned = join(releaseDir, "app-release-unsigned.apk");
const aligned = join(releaseDir, "app-release-aligned.apk");
if (!existsSync(unsigned)) fail(`Gradle produced no APK at ${unsigned}`);

console.log("\n> Aligning\n");
// -p aligns uncompressed .so files to the page boundary; -f overwrites.
run(zipalign, ["-p", "-f", "4", unsigned, aligned]);

const outDir = join(root, "public", "app");
mkdirSync(outDir, { recursive: true });
const signed = join(outDir, "nature-disaster-alert.apk");

console.log("\n> Signing\n");
run(apksigner, [
  "sign",
  "--ks", join(androidDir, "android.keystore"),
  "--ks-key-alias", signing.KEY_ALIAS,
  "--ks-pass", `pass:${signing.KEYSTORE_PASSWORD}`,
  "--key-pass", `pass:${signing.KEY_PASSWORD}`,
  "--out", signed,
  aligned,
]);

// apksigner writes a .idsig sidecar that is not needed to install.
const idsig = `${signed}.idsig`;
if (existsSync(idsig)) rmSync(idsig);

console.log("\n> Verifying\n");
run(apksigner, ["verify", "--print-certs", signed]);

const bytes = readFileSync(signed);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const mb = (statSync(signed).size / 1024 / 1024).toFixed(2);

console.log(`
  Built  public/app/nature-disaster-alert.apk
  Size   ${mb} MB
  SHA256 ${sha256}

  Deploy the site for the download link on /install to serve this build.
`);
