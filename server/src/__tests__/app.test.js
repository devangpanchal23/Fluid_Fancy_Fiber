import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../app.js";

test("health reports unavailable database and sends security headers", async () => {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.success, false);
    assert.equal(body.code, "DATABASE_UNAVAILABLE");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("unknown API paths return 404 without requiring database access", async () => {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/no-such-route`);
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.code, "NOT_FOUND");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("robots and sitemap are available without database access", async () => {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const robots = await fetch(`http://127.0.0.1:${port}/api/robots.txt`);
    const sitemap = await fetch(`http://127.0.0.1:${port}/api/sitemap.xml`);
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Disallow: \/admin\//);
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get("content-type"), /application\/xml/);
    assert.match(await sitemap.text(), /<loc>http:\/\/127\.0\.0\.1:[0-9]+\/privacy<\/loc>/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
