import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("환경변수 예시는 빈 값이며 비밀키에 공개 접두사가 없다", async () => {
  const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const entries = example.trim().split("\n");
  assert.deepEqual(entries, [
    "NEXT_PUBLIC_SUPABASE_URL=",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
    "SUPABASE_SERVICE_ROLE_KEY=",
    "TMDB_READ_ACCESS_TOKEN=",
    "G1_ALLOW_TEST_WRITES=",
    "G1_CAPTCHA_TOKEN_A=",
    "G1_CAPTCHA_TOKEN_B=",
    "G3_PROBE_ENABLED=",
    "APP_ALLOWED_ORIGINS=",
    "PROTECTION_HMAC_KEY=",
    "NEXT_PUBLIC_HCAPTCHA_SITE_KEY=",
    "M5_CAPTCHA_TOKEN=",
    "M5_VERIFY_ENV=",
  ]);
});
