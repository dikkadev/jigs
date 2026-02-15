#!/usr/bin/env bun
/**
 * One-time script to get a Spotify refresh token via Authorization Code flow.
 *
 * 1. Prints a URL — open it in your browser manually
 * 2. Authorize the app
 * 3. You'll be redirected to a URL that will fail to load — that's fine
 * 4. Copy the full redirect URL and paste it back here
 */

import { parseArgs } from "node:util";

const { values: flags } = parseArgs({
  options: { help: { type: "boolean", short: "h", default: false } },
  strict: true,
});

if (flags.help) {
  console.log(`
Get Spotify Refresh Token

  Walks you through the OAuth Authorization Code flow to obtain a refresh token.
  Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.

Usage:
  bun run scripts/get-refresh-token.ts
`);
  process.exit(0);
}

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = "http://127.0.0.1:8888/callback";

if (!clientId || !clientSecret) {
  console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env");
  process.exit(1);
}

const scopes = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private",
].join(" ");

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
  }).toString();

console.log("\n── Step 1: Open this URL in your browser ──\n");
console.log(authUrl);
console.log("\n── Step 2: Authorize, then copy the full redirect URL ──");
console.log("(It will look like: http://127.0.0.1:8888/callback?code=AQD...)\n");

process.stdout.write("Paste the redirect URL here: ");

const input = await new Promise<string>((resolve) => {
  process.stdin.once("data", (data) => resolve(data.toString().trim()));
});

const redirectParsed = new URL(input);
const code = redirectParsed.searchParams.get("code");

if (!code) {
  console.error("No authorization code found in that URL. Check and try again.");
  process.exit(1);
}

const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  }),
});

if (!tokenRes.ok) {
  const err = await tokenRes.text();
  console.error(`Token exchange failed (${tokenRes.status}): ${err}`);
  process.exit(1);
}

const tokenData = (await tokenRes.json()) as {
  refresh_token?: string;
  access_token?: string;
  scope?: string;
};

if (!tokenData.refresh_token) {
  console.error("No refresh_token in response:", tokenData);
  process.exit(1);
}

console.log("\n── Done! ──\n");
console.log("Refresh token:\n");
console.log(tokenData.refresh_token);
console.log("\nAdd this to your .env as SPOTIFY_REFRESH_TOKEN");
console.log("Granted scopes:", tokenData.scope);
