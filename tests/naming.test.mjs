import assert from "node:assert/strict";
import { test } from "node:test";
import { BREEDS, BREED_BY_ID } from "../js/breeds.js";
import { nameOptions, describe, mergedSize } from "../js/naming.js";

const b = (id) => BREED_BY_ID[id];

test("known designer crosses use their real names in either order", () => {
  assert.equal(nameOptions(b("labrador-retriever"), b("poodle"))[0], "Labradoodle");
  assert.equal(nameOptions(b("poodle"), b("labrador-retriever"))[0], "Labradoodle");
  assert.equal(nameOptions(b("beagle"), b("pug"))[0], "Puggle");
  assert.equal(nameOptions(b("siberian-husky"), b("pomeranian"))[0], "Pomsky");
});

test("every pair of breeds yields at least two non-empty, unique names", () => {
  for (const x of BREEDS) {
    for (const y of BREEDS) {
      if (x.id === y.id) continue;
      const names = nameOptions(x, y);
      assert.ok(names.length >= 2, `${x.name} + ${y.name}`);
      for (const n of names) assert.match(n, /^[A-Z][\p{L} '-]+$/u, `${x.name} + ${y.name} → ${n}`);
      assert.equal(new Set(names.map((n) => n.toLowerCase())).size, names.length);
    }
  }
});

test("breed ids are unique", () => {
  assert.equal(new Set(BREEDS.map((x) => x.id)).size, BREEDS.length);
});

test("description and size combine both parents", () => {
  const d = describe(b("boxer"), b("dalmatian"));
  assert.match(d, /Boxer/);
  assert.match(d, /Dalmatian/);
  assert.equal(mergedSize(b("chihuahua"), b("great-dane")), 3);
});
