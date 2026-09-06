#!/usr/bin/env node
/**
 * Deployed (or local) API smoke for Fosterfolio private beta.
 *
 *   API_BASE_URL=https://xxxx.execute-api.us-east-1.amazonaws.com npm run smoke
 *   API_BASE_URL=http://127.0.0.1:3000 SMOKE_PET_ID=… SMOKE_USER_ID=… npm run smoke
 *
 * Never logs tokens or response bodies that might contain PII beyond status + path.
 */
const base = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
if (!base) {
  console.error("API_BASE_URL is required (no trailing slash).");
  process.exit(1);
}

const petId = process.env.SMOKE_PET_ID?.trim();
const userId = process.env.SMOKE_USER_ID?.trim();

async function check(path, init = {}) {
  const url = `${base}${path}`;
  const response = await fetch(url, init);
  const ok = response.ok;
  console.log(`${ok ? "ok" : "FAIL"} ${response.status} ${path}`);
  if (!ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response;
}

async function main() {
  await check("/");
  const feed = await check("/posts?limit=5");
  const feedJson = await feed.json();
  if (!feedJson || !Array.isArray(feedJson.items)) {
    throw new Error("GET /posts did not return { items }");
  }
  await check("/search?q=a");
  if (petId) {
    await check(`/pets/${encodeURIComponent(petId)}`);
  }
  if (userId) {
    await check(`/users/${encodeURIComponent(userId)}`);
  }
  console.log("smoke passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
