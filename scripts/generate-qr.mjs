/**
 * Generate the install-page QR code once, at build time, into public/.
 *
 * Done as a build step rather than at runtime so the QR library never reaches
 * the browser bundle and the page stays a static render. The code points at
 * /install rather than straight at the APK, so an iPhone scanning it lands on
 * instructions that work for iPhone instead of downloading a file iOS cannot
 * open.
 */
import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.env.SITE_URL ?? "https://disasteralert.ankitgupta.com.np";
const target = `${SITE}/install`;

// A PNG rather than an SVG: next/image refuses SVG sources unless
// dangerouslyAllowSVG is enabled globally, and turning that on for the whole
// app to render one QR code is a bad trade.
mkdirSync(join(root, "public"), { recursive: true });
const out = join(root, "public", "install-qr.png");
await QRCode.toFile(out, target, {
  type: "png",
  errorCorrectionLevel: "M",
  margin: 1,
  width: 464, // 4x the rendered size, so it stays sharp on dense screens.
  // Rendered on a light chip so it scans in dark mode too.
  color: { dark: "#0b0b0b", light: "#ffffff" },
});
console.log(`generated public/install-qr.png -> ${target}`);
