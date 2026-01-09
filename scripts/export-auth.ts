import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "../.auth");
const STORAGE_STATE_PATH = path.join(AUTH_DIR, "storage-state.json");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

async function exportAuth() {
  mkdirSync(AUTH_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Navigate to ${APP_URL} and log in with Spotify.`);
  console.log("Press Enter when done...");

  await page.goto(APP_URL);

  await new Promise((resolve) => process.stdin.once("data", resolve));

  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log(`Saved auth state to ${STORAGE_STATE_PATH}`);

  await browser.close();
  process.exit(0);
}

exportAuth();
