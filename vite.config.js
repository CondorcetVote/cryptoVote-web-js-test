import wasm from 'vite-plugin-wasm'

// @condorcet.vote/crypto-vote is a wasm-bindgen `--target bundler` build:
// its entry does `import * as wasm from "./crypto_vote_bg.wasm"`.
// Vite 8 (rolldown) cannot resolve that on its own, so vite-plugin-wasm
// handles the WebAssembly ESM integration. It rewrites the import to an
// async instantiation + top-level await, which needs an ESM target.
export default {
  // Relative base so the build also works under a GitHub Pages sub-path.
  base: './',
  plugins: [wasm()],
  build: {
    // Native top-level await — avoids vite-plugin-top-level-await,
    // which is incompatible with Vite 8 / rolldown.
    target: 'esnext',
  },
}
