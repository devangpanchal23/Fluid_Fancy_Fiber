import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../utils/slugify.js";

test("slugify lowercases and hyphenates", () => {
  assert.equal(slugify("Mono Yarn"), "mono-yarn");
});

test("slugify strips non-alphanumeric characters", () => {
  assert.equal(slugify("Cascet / Yarn (24s)!"), "cascet-yarn-24s");
});

test("slugify trims leading/trailing hyphens", () => {
  assert.equal(slugify("  --Ready Beam--  "), "ready-beam");
});

test("slugify caps length at 160 characters", () => {
  const long = "a".repeat(200);
  assert.equal(slugify(long).length, 160);
});
