import assert from "node:assert/strict";
import { test } from "node:test";
import { BREED_BY_ID } from "../js/breeds.js";
import { dogToBreed, mixLook, myDogId, isMyDogId, MY_DOGS_GROUP } from "../js/mydogs.js";
import { nameOptions, describe } from "../js/naming.js";
import { buildPrompt } from "../js/imagegen.js";

const lab = BREED_BY_ID["labrador-retriever"];
const poodle = BREED_BY_ID["poodle"];
const corgi = BREED_BY_ID["pembroke-welsh-corgi"];

const savedDoodle = {
  id: "abc123",
  name: "Labradoodle",
  parents: [lab.id, poodle.id],
  parentNames: [lab.name, poodle.name],
  size: 4,
  traits: ["friendly", "outgoing", "eager", "intelligent", "proud"],
  look: mixLook(lab, poodle),
  thumbnail: "data:image/jpeg;base64,xyz",
};

test("a saved dog becomes a mergeable breed", () => {
  const b = dogToBreed(savedDoodle, (id) => BREED_BY_ID[id]);
  assert.equal(b.id, "my-abc123");
  assert.ok(isMyDogId(b.id));
  assert.ok(!isMyDogId(lab.id));
  assert.equal(b.group, MY_DOGS_GROUP);
  assert.equal(b.traits.length, 3);
  assert.match(b.look, /short dense coat.*blended with.*curled coat/);
  assert.equal(b.promptName, "Labradoodle (a Labrador Retriever and Poodle mix)");
  assert.equal(myDogId(savedDoodle), b.id);
});

test("dogs saved before looks were stored get one from their parents", () => {
  const { look, ...old } = savedDoodle;
  const b = dogToBreed(old, (id) => BREED_BY_ID[id]);
  assert.equal(b.look, mixLook(lab, poodle));
});

test("a saved dog can be merged with a breed: name, description and prompt", () => {
  const doodle = dogToBreed(savedDoodle, (id) => BREED_BY_ID[id]);
  const names = nameOptions(doodle, corgi);
  assert.ok(names.length >= 2);
  for (const n of names) assert.match(n, /^[A-Z]/);
  assert.match(describe(doodle, corgi), /family looks of a Labradoodle and the short legs of a Pembroke Welsh Corgi\.$/);
  const prompt = buildPrompt(doodle, corgi);
  assert.match(prompt, /Labradoodle \(a Labrador Retriever and Poodle mix\)/);
  assert.match(prompt, /Pembroke Welsh Corgi/);
});

test("looks stay short across several generations", () => {
  let parent = dogToBreed(savedDoodle, (id) => BREED_BY_ID[id]);
  for (let gen = 0; gen < 6; gen++) {
    const child = { id: `g${gen}`, name: `Gen${gen}`, parentNames: [parent.name, corgi.name], size: 3, traits: ["a", "b", "c"], look: mixLook(parent, corgi) };
    parent = dogToBreed(child, () => undefined);
  }
  assert.ok(parent.look.length < 300, `look grew to ${parent.look.length} characters`);
});
