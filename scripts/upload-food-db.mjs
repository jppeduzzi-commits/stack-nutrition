// One-time (re-run whenever the food database is regenerated) upload of the
// built SQLite food database to Vercel Blob. The build step downloads it
// from there -- the file itself never goes into git (too big for a normal
// GitHub push without LFS) and is never fetched at request time (would burn
// through Blob's free bandwidth tier fast).
import { put } from "@vercel/blob";
import { readFileSync } from "node:fs";

const file = readFileSync(new URL("../data/foods.sqlite", import.meta.url));
const result = await put("foods.sqlite", file, {
  access: "public",
  addRandomSuffix: false,
  token: process.env.BLOB_READ_WRITE_TOKEN,
  allowOverwrite: true,
});
console.log("Uploaded:", result.url);
