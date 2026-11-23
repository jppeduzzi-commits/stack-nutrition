// Runs before `next build` (see package.json). Downloads the food database
// from Vercel Blob into data/foods.sqlite so it's present for Next.js to
// bundle into the search API route -- once per deploy, not once per
// request, so this never touches Blob's free bandwidth tier in any
// meaningful way. The file is public (plain nutrition data, nothing
// sensitive), so no token is needed to fetch it, including in local dev.
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const URL_ = "https://mjfbybfbyvebbo0n.public.blob.vercel-storage.com/foods.sqlite";
const OUT = new URL("../data/foods.sqlite", import.meta.url);

if (existsSync(OUT)) {
  console.log("data/foods.sqlite already present, skipping fetch");
  process.exit(0);
}

console.log(`Fetching food database from Blob ...`);
const res = await fetch(URL_);
if (!res.ok) {
  console.error(`Failed to fetch food database: ${res.status} ${res.statusText}`);
  process.exit(1);
}
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUT, Buffer.from(await res.arrayBuffer()));
console.log("Saved data/foods.sqlite");
