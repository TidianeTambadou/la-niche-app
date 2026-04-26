/**
 * Fragella API client — primary fragrance lookup source.
 *
 * https://api.fragella.com/api/v1/* — authenticated via the `x-api-key`
 * header. Used by /api/agent (search + identify) BEFORE falling back to the
 * slow Tavily + Fragrantica scraping pipeline. When Fragella has the
 * perfume, the response is fast (one HTTP round trip, no LLM); when it
 * doesn't, the caller receives `null` and the UI can prompt the user to
 * ask the concierge.
 *
 * Server-side only — keeps `process.env.FRAGELLA_API_KEY` out of the bundle.
 */

const FRAGELLA_BASE_URL =
  process.env.FRAGELLA_BASE_URL ?? "https://api.fragella.com/api/v1";

/** Accord with its weight (0..100). Fragella sometimes ships accords as
 *  bare strings, sometimes as `{name, percent}` — the normaliser unifies
 *  both into this shape. */
export type FragellaAccord = {
  name: string;
  weight?: number;
};

/** Normalised perfume shape — what every consumer in the app expects.
 *  We keep field names tolerant since Fragella's actual schema isn't fully
 *  documented yet; the normaliser falls through several common keys. */
export type FragellaPerfume = {
  /** Stable identifier — Fragella's own when present, otherwise derived. */
  id: string;
  name: string;
  brand: string;
  /** Bottle photo — already a CDN URL, no scraping needed. */
  image_url: string | null;
  /** Marketing/editorial blurb if Fragella ships one. */
  description: string | null;
  /** Gender label (men / women / unisex). */
  gender: string | null;
  /** Olfactive family (single string). */
  family: string | null;
  notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  accords: FragellaAccord[];
  /** Free-form longevity (e.g. "7h", "Long lasting"). */
  longevity: string | null;
  /** Free-form sillage (e.g. "Strong", "Moderate"). */
  sillage: string | null;
  /** Subset of "winter" / "spring" / "summer" / "autumn". */
  seasons: string[];
  /** Subset of "day" / "night". */
  day_time: string[];
  /** Average rating 0..5. */
  rating: number | null;
  reviews_count: number | null;
  /** Best-effort canonical URL (Fragella public page or Fragrantica). */
  source_url: string | null;
};

/** ─── Network helper ──────────────────────────────────────────────────── */

async function fragellaFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response | null> {
  const apiKey = process.env.FRAGELLA_API_KEY;
  if (!apiKey) {
    console.warn("[fragella] FRAGELLA_API_KEY not set — skipping");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    init?.timeoutMs ?? 5000,
  );

  try {
    const res = await fetch(`${FRAGELLA_BASE_URL}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    return res;
  } catch (e) {
    console.warn("[fragella] fetch failed:", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** ─── Normalisation helpers ───────────────────────────────────────────── */

function toStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

/** Coerce a value into a string[] — tolerates arrays of strings or arrays
 *  of objects shaped like `{name: string}` (common for accords/notes APIs). */
function toArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") return x.trim();
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const candidate =
          (typeof o.name === "string" && o.name) ||
          (typeof o.label === "string" && o.label) ||
          (typeof o.note === "string" && o.note) ||
          (typeof o.accord === "string" && o.accord);
        return typeof candidate === "string" ? candidate.trim() : "";
      }
      return "";
    })
    .filter((s): s is string => s.length > 0);
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    if (isFinite(n)) return n;
  }
  return null;
}

/** Normalise accords — accepts strings, `{name, percent}`, `{name, weight}`,
 *  `{accord, score}`, etc. */
function toAccords(v: unknown): FragellaAccord[] {
  if (!Array.isArray(v)) return [];
  const out: FragellaAccord[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push({ name: t });
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name =
        toStr(o.name) ?? toStr(o.label) ?? toStr(o.accord) ?? toStr(o.title);
      if (!name) continue;
      const weight =
        toNum(o.weight) ??
        toNum(o.percent) ??
        toNum(o.score) ??
        toNum(o.percentage);
      out.push(weight !== null ? { name, weight } : { name });
    }
  }
  return out;
}

/** Sub-set of `["winter","spring","summer","autumn"]` parsed from whatever
 *  shape Fragella ships. Tolerates booleans (`{winter: true, …}`),
 *  string arrays, or comma-separated strings. */
function toSeasons(raw: unknown): string[] {
  const allowed = new Set(["winter", "spring", "summer", "autumn"]);
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const v of raw) {
      const s = typeof v === "string" ? v.trim().toLowerCase() : "";
      if (allowed.has(s)) out.push(s);
    }
  } else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of allowed) if (o[k]) out.push(k);
  } else if (typeof raw === "string") {
    for (const part of raw.split(/[,;]/)) {
      const s = part.trim().toLowerCase();
      if (allowed.has(s)) out.push(s);
    }
  }
  return [...new Set(out)];
}

function toDayTime(raw: unknown): string[] {
  const allowed = new Set(["day", "night"]);
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const v of raw) {
      const s = typeof v === "string" ? v.trim().toLowerCase() : "";
      if (allowed.has(s)) out.push(s);
    }
  } else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of allowed) if (o[k]) out.push(k);
  } else if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "both" || s === "any") return ["day", "night"];
    for (const part of s.split(/[,;]/)) {
      const v = part.trim();
      if (allowed.has(v)) out.push(v);
    }
  }
  return [...new Set(out)];
}

function normalizeOne(raw: unknown): FragellaPerfume | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = toStr(r.name) ?? toStr(r.fragrance) ?? toStr(r.title);
  const brand =
    toStr(r.brand) ?? toStr(r.house) ?? toStr(r.brand_name);
  if (!name || !brand) return null;

  // Notes: try {top, middle/heart, base} object first, then flat array.
  const notesRaw = r.notes;
  let top: string[] = [];
  let middle: string[] = [];
  let base: string[] = [];
  if (notesRaw && typeof notesRaw === "object" && !Array.isArray(notesRaw)) {
    const n = notesRaw as Record<string, unknown>;
    top = toArr(n.top);
    middle = toArr(n.middle ?? n.heart);
    base = toArr(n.base);
  } else if (Array.isArray(notesRaw)) {
    middle = toArr(notesRaw);
  }
  // Fragella sometimes ships flat top/middle/base at the root.
  if (top.length === 0) top = toArr(r.top);
  if (middle.length === 0) middle = toArr(r.middle ?? r.heart);
  if (base.length === 0) base = toArr(r.base);

  const image_url =
    toStr(r.image_url) ??
    toStr(r.imageUrl) ??
    toStr(r.image) ??
    toStr(r.thumbnail) ??
    null;

  const id =
    toStr(r.id) ??
    toStr(r.slug) ??
    `${brand}-${name}`.toLowerCase().replace(/\s+/g, "-");

  const ratingNum = toNum(r.rating) ?? toNum(r.score);
  const reviewsRaw = toNum(r.reviews_count) ?? toNum(r.reviews);

  return {
    id,
    name,
    brand,
    image_url,
    description: toStr(r.description) ?? toStr(r.summary) ?? null,
    gender: toStr(r.gender) ?? toStr(r.sex) ?? null,
    family: toStr(r.family) ?? toStr(r.olfactive_family) ?? null,
    notes: { top, middle, base },
    accords: toAccords(r.accords),
    longevity: toStr(r.longevity) ?? toStr(r.duration) ?? null,
    sillage: toStr(r.sillage) ?? toStr(r.projection) ?? null,
    seasons: toSeasons(r.seasons ?? r.season),
    day_time: toDayTime(r.day_time ?? r.daytime ?? r.time_of_day),
    rating: ratingNum,
    reviews_count: reviewsRaw !== null ? Math.round(reviewsRaw) : null,
    source_url:
      toStr(r.source_url) ?? toStr(r.url) ?? toStr(r.fragrantica_url) ?? null,
  };
}

/** Pull the array of perfumes from whichever field Fragella ships them in.
 *  Tolerates `{ data: [] }`, `{ results: [] }`, `{ fragrances: [] }`, or a
 *  bare array. */
function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const key of ["data", "results", "fragrances", "items"]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** ─── Public API ──────────────────────────────────────────────────────── */

/**
 * Multi-candidate search — used by the autocomplete + search page.
 *
 * Returns:
 *   - `FragellaPerfume[]`  : matches found
 *   - `null`               : Fragella unreachable / unconfigured / no match
 *
 * Caller distinguishes "API down" from "no match" by treating both as
 * `null` and surfacing the concierge fallback in either case.
 */
export async function searchFragella(
  query: string,
  limit = 5,
): Promise<FragellaPerfume[] | null> {
  const q = query.trim();
  if (!q) return [];

  const path = `/fragrances?search=${encodeURIComponent(q)}&limit=${limit}`;
  const res = await fragellaFetch(path);
  if (!res) return null;
  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn(`[fragella] search ${res.status}`);
    return null;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }

  const list = extractList(data);
  const normalised = list
    .map(normalizeOne)
    .filter((p): p is FragellaPerfume => p !== null)
    .slice(0, limit);

  return normalised.length > 0 ? normalised : null;
}

/** Single-perfume lookup by brand + name — used by /scan after the vision
 *  step has identified a candidate. Just a search restricted to limit=1. */
export async function getFragellaPerfume(
  brand: string,
  name: string,
): Promise<FragellaPerfume | null> {
  const matches = await searchFragella(`${brand} ${name}`, 1);
  return matches?.[0] ?? null;
}

/**
 * "Similar to" lookup — useful for the recommendation flow when the user
 * has wishlisted some perfumes and we want quick same-vibe alternatives
 * without spinning up the heavy Tavily/Curator pipeline.
 *
 * GET /fragrances/similar?name=<name>&limit=<n>
 */
export async function getSimilarFragella(
  name: string,
  limit = 5,
): Promise<FragellaPerfume[] | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const path = `/fragrances/similar?name=${encodeURIComponent(trimmed)}&limit=${limit}`;
  const res = await fragellaFetch(path);
  if (!res || !res.ok) return null;
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const list = extractList(data)
    .map(normalizeOne)
    .filter((p): p is FragellaPerfume => p !== null);
  return list.length > 0 ? list.slice(0, limit) : null;
}

/**
 * Profile-driven match — finds perfumes from the user's olfactive
 * preferences expressed as accords (with weights) and notes per layer.
 *
 * GET /fragrances/match?accords=floral:100,fruity:90&top=Pear,Bergamot
 *     &middle=Freesia&base=Iso%20E%20Super&limit=3
 *
 * `accords` is a record of `{ accordName: weight 0..100 }`.
 */
export async function matchFragella(input: {
  accords?: Record<string, number>;
  top?: string[];
  middle?: string[];
  base?: string[];
  limit?: number;
}): Promise<FragellaPerfume[] | null> {
  const params: string[] = [];
  if (input.accords) {
    const accordsStr = Object.entries(input.accords)
      .map(([k, w]) => `${k}:${Math.round(w)}`)
      .join(",");
    if (accordsStr) params.push(`accords=${encodeURIComponent(accordsStr)}`);
  }
  if (input.top?.length)
    params.push(`top=${encodeURIComponent(input.top.join(","))}`);
  if (input.middle?.length)
    params.push(`middle=${encodeURIComponent(input.middle.join(","))}`);
  if (input.base?.length)
    params.push(`base=${encodeURIComponent(input.base.join(","))}`);
  params.push(`limit=${input.limit ?? 5}`);

  const res = await fragellaFetch(`/fragrances/match?${params.join("&")}`);
  if (!res || !res.ok) return null;
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const list = extractList(data)
    .map(normalizeOne)
    .filter((p): p is FragellaPerfume => p !== null);
  return list.length > 0 ? list : null;
}
