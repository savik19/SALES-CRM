// ---------------------------------------------------------------------------
// Runtime configuration (environment-driven).
// ---------------------------------------------------------------------------
// Keep all environment lookups here so there is one place to see what the app
// needs from the outside world. Values come from `.env.local` (see .env.example).
//
// NEXT_PUBLIC_* vars are exposed to the browser — safe for a public API base
// URL, NOT for secrets. Secrets belong on the Laravel backend, never here.
// ---------------------------------------------------------------------------

// Base URL of the Laravel API, e.g. "https://api.scriptguru.example".
// Empty during the mock phase; set it in .env.local when the API is ready.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Feature flag: while true, the data layer serves mock data instead of calling
// the API. Flip to false (or remove) once every endpoint in leadsApi.js is wired.
export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false" && !API_BASE_URL;
