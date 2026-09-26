// Saved dogs can be merged again. These helpers turn a collection entry into a
// breed-like object that the pickers, naming and image prompt all understand.

export const MY_DOGS_GROUP = "Your dogs";
const ID_PREFIX = "my-";

export function myDogId(dog) {
  return ID_PREFIX + dog.id;
}

export function isMyDogId(id) {
  return typeof id === "string" && id.startsWith(ID_PREFIX);
}

const MAX_SUMMARY = 100;

// The first couple of phrases of a look, capped so looks stay short across generations.
function lookSummary(breed) {
  const text = breed.look.split(",").slice(0, 2).map((s) => s.trim()).filter(Boolean).join(" and ");
  if (text.length <= MAX_SUMMARY) return text;
  return text.slice(0, text.lastIndexOf(" ", MAX_SUMMARY)).replace(/\s+(and|with|of|in|blended)$/, "");
}

// Appearance of a merged dog, built from both parents' looks.
export function mixLook(a, b) {
  return `${lookSummary(a)}, blended with ${lookSummary(b)}`;
}

// `findBreed(id)` resolves parent ids; it's only needed for dogs saved before looks were stored.
export function dogToBreed(dog, findBreed) {
  let look = dog.look;
  if (!look) {
    const [a, b] = (dog.parents || []).map(findBreed);
    look = a && b ? mixLook(a, b) : "mixed-breed coat";
  }
  return {
    id: myDogId(dog),
    name: dog.name,
    group: MY_DOGS_GROUP,
    size: dog.size || 3,
    traits: (dog.traits || []).slice(0, 3),
    look,
    // Invented names mean nothing to the image generator, so describe the ancestry too.
    promptName: `${dog.name} (a ${dog.parentNames.join(" and ")} mix)`,
    parentNames: dog.parentNames,
    thumbnail: dog.thumbnail || dog.imageUrl,
    custom: true,
  };
}
