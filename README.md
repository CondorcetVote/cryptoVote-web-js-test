# test @condorcet.vote/crypto-vote in the browser

A minimal, no-framework web page that exercises every function of
[`@condorcet.vote/crypto-vote`](https://www.npmjs.com/package/@condorcet.vote/crypto-vote)
(generate identity, validate / derive key, sign a ballot, verify a ballot),
bundled with **Vite 8** and deployed to **GitHub Pages**.

## Run

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

The page imports the package through its **standard entry point**:

```js
import { generate_identity_wasm, sign_vote_str_wasm /* … */ } from '@condorcet.vote/crypto-vote'
```

> ⚠️ Must be served over **HTTP** (`npm run dev` / `preview` / GitHub Pages).
> Opening `dist/index.html` directly via `file://` does **not** work: ES module
> scripts are CORS-blocked on the `file://` origin in Chrome.

## How the build handles the WASM

`@condorcet.vote/crypto-vote` is a wasm-bindgen **`--target bundler`** build. Its
entry point does:

```js
import * as wasm from "./crypto_vote_bg.wasm";
```

This is WebAssembly/ESM integration, which Vite 8 (rolldown) cannot resolve on
its own. The fix is a single, standard plugin — see [vite.config.js](vite.config.js):

```js
import wasm from 'vite-plugin-wasm'
export default {
  base: './',
  plugins: [wasm()],
  build: { target: 'esnext' }, // native top-level await
}
```

Notes:
- `vite-plugin-wasm` rewrites the `.wasm` import into an async instantiation
  plus top-level await — hence `target: 'esnext'`.
- `vite-plugin-top-level-await` is **not** used: it is incompatible with Vite 8
  (it requires `rollup`, but Vite 8 uses rolldown). `target: 'esnext'` covers it.
- `base: './'` keeps asset paths relative so the build works under the GitHub
  Pages project sub-path (`/<repo>/`).

## Compatibility findings (the package as published, v0.0.9)

Tested importing the **default entry** `from '@condorcet.vote/crypto-vote'`:

| Toolchain | Result |
|---|---|
| Node ≥ 25 (ESM) | ✅ works natively (WASM-ESM enabled by default) |
| Vite 8 + `vite-plugin-wasm` + `target: esnext` | ✅ works (this project) |
| Vite 8 vanilla | ❌ `builtin:vite-wasm-fallback` cannot load `.wasm` |
| `vite-plugin-top-level-await` on Vite 8 | ❌ plugin requires `rollup` |
| Bun (run & bundle) | ❌ treats `.wasm` as a static asset → `wasm.* is not a function` |

The crypto itself is correct everywhere it loads: signing produces a valid
proof, verification returns `true` for the original ballot and `false` for a
tampered one.

### Suggestion for the package maintainer

Shipping only a `--target bundler` build limits portability. Consider also
publishing a **`--target web`** build (async `init()` — works in Vite, Bun,
plain `<script type="module">`, and from a CDN with no bundler config) and an
`exports` map with `node` / `browser` / `default` conditions.

## Deployment

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds with Vite
and publishes `dist/` to GitHub Pages on every push to `main`. Enable it once in
**Settings → Pages → Source → GitHub Actions**.
