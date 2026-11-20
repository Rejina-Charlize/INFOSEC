import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import app from "../src/app.js";

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.close();
  await once(server, "close");
});

test("health endpoint returns the API liveness response", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("staff API requires Basic authentication", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate"), /^Basic/);
});

test("invalid medicine pagination returns a JSON client error", async () => {
  const response = await fetch(`${baseUrl}/api/medicines?page=-1`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Invalid pagination values." });
});
