# test @condorcet.vote/crypto-vote in the browser

A minimal, no-framework web page that exercises every function of
[`@condorcet.vote/crypto-vote`](https://www.npmjs.com/package/@condorcet.vote/crypto-vote)
(generate identity, validate / derive key, sign a ballot, verify a ballot),
bundled with **Vite 8** and deployed to **GitHub Pages**.

**Live demo:** https://condorcetvote.github.io/cryptoVote-web-js-test/

## Run

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

Serve over HTTP (`npm run dev` / `preview` / GitHub Pages) — a bundled ESM app
needs a server, it is not meant to be opened as a `file://`.

## Usage

The package is a wasm-bindgen **`--target web`** build: a self-contained ES
module that instantiates its own WASM through an async `init()`. You import it
the standard way and `await init()` once — **no Vite plugin, no config**:

```js
import init, { generate_identity_wasm /* … */ } from '@condorcet.vote/crypto-vote'

await init()                       // instantiate the WASM once
const [secret, pub] = generate_identity_wasm()
```

Vite resolves the `.wasm` asset on its own (the package locates it via
`new URL('crypto_vote_bg.wasm', import.meta.url)`), so [vite.config.js](vite.config.js)
only sets `base: './'` for the GitHub Pages sub-path. Nothing else is required.

## Functions

| Function | Purpose |
|---|---|
| `generate_identity_wasm()` | → `[secretBytes, publicHex]` |
| `is_valid_secret_key_wasm(secretBytes)` | → `boolean` |
| `derive_public_key_wasm(secretBytes)` | → `publicHex` |
| `sign_vote_str_wasm(secretBytes, vote, electionId, ring)` | → `[signatureHex, keyImageHex]` |
| `verify_vote_str_wasm(vote, electionId, signatureHex, keyImageHex, ring)` | → `boolean` |

A ring needs **≥ 2** public keys and must include the signer's. Use button **A**
to generate an identity (it pre-fills the other fields), **D** to sign, **E** to
verify.

## Deployment

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds with Vite and
publishes `dist/` to GitHub Pages on every push to `main`. Enable it once in
**Settings → Pages → Source → GitHub Actions**.

## License

[MIT](LICENSE)
