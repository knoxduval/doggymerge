# 🐶 Doggy Merge

Pick two dog breeds, merge them into a brand-new breed, see an AI-generated picture of the result, and add it to your collection.

Works in any modern browser and adapts to phone (iPhone), tablet (iPad) and desktop screens. It can also be added to the home screen.

## Features

- **Two breed lists** with 138 major breeds, searchable and filterable by group (Sporting, Hound, Working, Terrier, Toy, Non-Sporting, Herding).
- **Merge** any two breeds, or tap **🎲 Surprise me** for a random pair.
- **Generated names**: well-known crosses get their real names (Labradoodle, Puggle, Pomsky…); every other pair gets an invented name that blends syllables from both breeds (e.g. Rottweiler + Golden Retriever → *Rottriever*). Tap 🔀 for alternatives, or type your own.
- **AI image** of the new dog, built from both parents' coats and features. Tap **🔄 New image** for a different take.
- **Collection** saved in your browser (localStorage), with a detail view and a remove option.

## Running locally

It's a static site with no build step. Serve the folder with any web server (ES modules don't load from `file://`):

```sh
npm start          # python3 -m http.server 8000
# then open http://localhost:8000
```

Run the tests (Node 18+):

```sh
npm test
```

## Image generation

Images come from [Pollinations](https://pollinations.ai), which is free and needs no API key: the prompt and a random seed are encoded in an image URL. To use a different provider, change `imageUrl()` in `js/imagegen.js`. A provider that needs a secret API key should go through a small backend proxy so the key never reaches the browser.

When you save a dog, the app also tries to store a small thumbnail of the image in the collection, so saved dogs keep their picture even if the generator changes.

## Project layout

```
index.html            App shell
css/styles.css        Responsive styles (light and dark mode)
js/app.js             UI and state
js/breeds.js          Breed catalogue (group, size, temperament, look)
js/naming.js          Breed-name generator and description
js/imagegen.js        Prompt building and image-generator calls
js/storage.js         Collection persistence
tests/                Node tests for the naming logic
```

## Deploying

Any static host works: GitHub Pages, Netlify, Vercel, Cloudflare Pages. For GitHub Pages, enable Pages on the branch and folder containing `index.html`.
