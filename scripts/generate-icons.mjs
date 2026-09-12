/**
 * Generate every piece of app artwork from public/logo.png.
 *
 *   npm run generate:icons
 *
 * The supplied logo is a full lockup: the circular emblem plus the words
 * "NATURE DISASTER ALERT / Made by DTEmpire". That reads well large and turns
 * to mush at 48 pixels, and in the site header it would repeat the wordmark
 * already printed beside it. So the emblem is extracted for every small use
 * and the full lockup is kept where there is room for it.
 *
 * Crop measured against the 1254x1254 source: the ring sits at x 300-945,
 * y 150-710, with the wordmark beginning just below.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "public", "logo.png");
const EMBLEM = { left: 300, top: 150, width: 645, height: 560 };
const SURFACE = { r: 13, g: 13, b: 13, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const emblem = () => sharp(SRC).extract(EMBLEM);

/** Emblem centred on the app's dark surface, never on a white box. */
async function tile(size, padRatio = 0.06) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const art = await emblem()
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: SURFACE } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toBuffer();
}

const pub = (name) => join(root, "public", name);

// Transparent emblem for the header, where the page background shows through.
await emblem().resize(256, 256, { fit: "contain", background: CLEAR })
  .png().toFile(pub("logo-badge.png"));

await sharp(await tile(192)).toFile(pub("icon-192.png"));
await sharp(await tile(512)).toFile(pub("icon-512.png"));
await sharp(await tile(180, 0.05)).toFile(pub("apple-icon.png"));
await sharp(await tile(32, 0.02)).toFile(join(root, "src", "app", "icon.png"));

// Launchers crop maskable icons to a circle, so the art sits in the safe zone.
await sharp(await tile(512, 0.17)).toFile(pub("icon-maskable.png"));

const resRoot = join(root, "android-capacitor", "app", "src", "main", "res");
for (const [density, size] of Object.entries({
  mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192,
})) {
  const dir = join(resRoot, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  const icon = await tile(size);
  await sharp(icon).toFile(join(dir, "ic_launcher.png"));
  await sharp(icon).toFile(join(dir, "ic_launcher_round.png"));

  // Adaptive foregrounds are drawn at 1.5x and cropped, so the art is inset.
  const canvas = Math.round(size * 1.5);
  const art = await emblem()
    .resize(Math.round(canvas * 0.56), Math.round(canvas * 0.56), { fit: "contain", background: CLEAR })
    .png()
    .toBuffer();
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: CLEAR } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(join(dir, "ic_launcher_foreground.png"));
}

// The splash screen has room for the full lockup, words and all.
mkdirSync(join(resRoot, "drawable"), { recursive: true });
const lockup = await sharp(SRC).resize(760, 760, { fit: "inside" }).png().toBuffer();
await sharp({ create: { width: 1080, height: 1920, channels: 4, background: SURFACE } })
  .composite([{ input: lockup, gravity: "center" }])
  .png()
  .toFile(join(resRoot, "drawable", "splash.png"));

console.log("icons generated from public/logo.png");
