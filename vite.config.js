// @condorcet.vote/crypto-vote ships a wasm-bindgen `--target web` build:
// a self-contained ES module that instantiates its own WASM through an
// async `init()`. No plugin is needed — Vite resolves the `.wasm` asset
// from the `new URL('…', import.meta.url)` inside the package on its own.
export default {
  // Relative asset paths so the build works under a GitHub Pages sub-path.
  base: './',
}
