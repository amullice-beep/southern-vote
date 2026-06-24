/* Regenerate the app icon set from public/icon-master.png — the cleaned,
   centered, full-bleed render of "Southern Vote Logo.pdf".
   Run: node scripts/gen-icons.mjs   (sharp is already a dependency)

   icon-master.png is committed, so this needs no external source file. */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const master = resolve(root, "public/icon-master.png");
const out = (f) => resolve(root, "public", f);

// The master is already a full-bleed cream square with the artwork inset by
// ~16% on each side, so its content sits safely inside the maskable safe zone.
const sizes = [
  ["favicon.png", 64],
  ["apple-touch-icon.png", 180],
  ["pwa-192.png", 192],
  ["pwa-512.png", 512],
  ["pwa-512-maskable.png", 512],
];

for (const [file, size] of sizes) {
  await sharp(master).resize(size, size).png().toFile(out(file));
  console.log("wrote", file, `${size}x${size}`);
}
