// Searches the bundled USDA food database (SR Legacy + Foundation generics,
// plus ~1M quality-filtered Branded Foods -- see scripts/README-food-db.md).
// The ~180MB SQLite file is fetched from Vercel
// Blob at *build* time (scripts/fetch-food-db.mjs) and bundled into this
// route's Function via outputFileTracingIncludes (next.config.js) -- so
// there's zero network cost per request, just a local file read.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

let db = null;
let searchStmt = null;

function getDb() {
  if (db) return db;
  const dbPath = path.join(process.cwd(), "data", "foods.sqlite");
  db = new DatabaseSync(dbPath, { readOnly: true });
  searchStmt = db.prepare(`
    SELECT f.fdc_id, f.kind, f.name, f.brand, f.serving_size_g, f.serving_label,
           f.p, f.c, f.f, f.kcal
    FROM foods_fts
    JOIN foods f ON f.rowid = foods_fts.rowid
    WHERE foods_fts MATCH ?
    ORDER BY rank
    LIMIT 25
  `);
  return db;
}

// FTS5 query syntax treats *, ", - etc. as operators -- escape the user's
// raw text into a sequence of quoted-prefix terms so arbitrary typed input
// (including punctuation) can't throw a syntax error or inject operators.
function toFtsQuery(raw) {
  const terms = raw.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t.replace(/"/g, '""')}"*`).join(" ");
}

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q") || "";
  const ftsQuery = toFtsQuery(q);
  if (!ftsQuery) return Response.json({ results: [] });

  try {
    getDb();
    const rows = searchStmt.all(ftsQuery);
    const results = rows.map((r) => ({
      id: r.fdc_id,
      name: r.brand ? `${r.name} (${r.brand})` : r.name,
      kind: r.kind,
      brand: r.brand,
      servingSizeG: r.serving_size_g,
      servingLabel: r.serving_label,
      p: r.p,
      c: r.c,
      f: r.f,
      kcal: r.kcal,
    }));
    return Response.json({ results });
  } catch (e) {
    console.error("food-search:", e);
    return Response.json({ results: [], error: "search failed" }, { status: 502 });
  }
}
