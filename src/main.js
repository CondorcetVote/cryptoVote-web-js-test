// Standard consumer usage of the `--target web` build: import the async
// `init` (default export) plus the functions, await init once, then use them.
import init, {
  generate_identity_wasm,
  derive_public_key_wasm,
  is_valid_prefixed_secret_key_wasm,
  secret_key_from_prefixed_wasm,
  secret_key_to_prefixed_wasm,
  sign_vote_str_wasm,
  verify_vote_str_wasm,
  generate_nonce_wasm,
  prove_ownership_wasm,
  verify_ownership_wasm,
} from '@condorcet.vote/crypto-vote'

const status = document.getElementById('status')

function parseRing(text) {
  return text.trim().split('\n').map(l => l.trim()).filter(Boolean)
}

function setResult(id, text, isOk = null) {
  const el = document.getElementById(id)
  el.textContent = text
  el.className = 'result' + (isOk === true ? ' ok' : isOk === false ? ' err' : '')
}

function wireUp() {
  // A — Generate identity
  document.getElementById('btn-generate').addEventListener('click', () => {
    try {
      const [secretBytes, publicKey] = generate_identity_wasm()
      const secretPrefixed = secret_key_to_prefixed_wasm(secretBytes)
      secretBytes.fill(0)
      setResult('out-secret', secretPrefixed)
      setResult('out-public', publicKey)
      document.getElementById('in-validate-secret').value = secretPrefixed
      document.getElementById('in-derive-secret').value = secretPrefixed
      document.getElementById('in-sign-secret').value = secretPrefixed
      const ring = document.getElementById('in-sign-ring')
      if (!ring.value.includes(publicKey)) {
        ring.value = (ring.value ? ring.value + '\n' : '') + publicKey
      }
    } catch (e) {
      setResult('out-secret', String(e), false)
    }
  })

  // B — Validate secret key
  document.getElementById('btn-validate').addEventListener('click', () => {
    try {
      const prefixed = document.getElementById('in-validate-secret').value.trim()
      const valid = is_valid_prefixed_secret_key_wasm(prefixed)
      setResult('out-validate', valid ? 'Valid secret key' : 'Invalid secret key', valid)
    } catch (e) {
      setResult('out-validate', String(e), false)
    }
  })

  // C — Derive public key
  document.getElementById('btn-derive').addEventListener('click', () => {
    try {
      const prefixed = document.getElementById('in-derive-secret').value.trim()
      const bytes = secret_key_from_prefixed_wasm(prefixed)
      const pubKey = derive_public_key_wasm(bytes)
      bytes.fill(0)
      setResult('out-derive', pubKey, true)
    } catch (e) {
      setResult('out-derive', String(e), false)
    }
  })

  // D — Sign vote
  document.getElementById('btn-sign').addEventListener('click', () => {
    try {
      const secretPrefixed = document.getElementById('in-sign-secret').value.trim()
      const vote = document.getElementById('in-sign-vote').value
      const electionId = document.getElementById('in-sign-election').value.trim()
      const ring = parseRing(document.getElementById('in-sign-ring').value)

      if (ring.length < 2) throw new Error('Ring must have at least 2 public keys')

      const secretBytes = secret_key_from_prefixed_wasm(secretPrefixed)
      const [signatureHex, keyImageHex] = sign_vote_str_wasm(secretBytes, vote, electionId, ring)
      secretBytes.fill(0)

      setResult('out-sign-sig', signatureHex)
      setResult('out-sign-ki', keyImageHex)

      document.getElementById('in-verify-vote').value = vote
      document.getElementById('in-verify-election').value = electionId
      document.getElementById('in-verify-sig').value = signatureHex
      document.getElementById('in-verify-ki').value = keyImageHex
      document.getElementById('in-verify-ring').value = document.getElementById('in-sign-ring').value

      // Chain into the ownership-proof flow (F/G): the key image just
      // produced is exactly the one prove/verify_ownership is about.
      document.getElementById('in-prove-secret').value = secretPrefixed
      document.getElementById('in-prove-election').value = electionId
      document.getElementById('in-vown-election').value = electionId
      document.getElementById('in-vown-ki').value = keyImageHex
    } catch (e) {
      setResult('out-sign-sig', String(e), false)
      setResult('out-sign-ki', '')
    }
  })

  // E — Verify vote
  document.getElementById('btn-verify').addEventListener('click', () => {
    try {
      const vote = document.getElementById('in-verify-vote').value
      const electionId = document.getElementById('in-verify-election').value.trim()
      const sigHex = document.getElementById('in-verify-sig').value.trim()
      const kiHex = document.getElementById('in-verify-ki').value.trim()
      const ring = parseRing(document.getElementById('in-verify-ring').value)

      const valid = verify_vote_str_wasm(vote, electionId, sigHex, kiHex, ring)
      setResult('out-verify', valid ? 'Signature is VALID' : 'Signature is INVALID', valid)
    } catch (e) {
      setResult('out-verify', String(e), false)
    }
  })

  // F — Generate verifier nonce
  document.getElementById('btn-nonce').addEventListener('click', () => {
    try {
      const nonce = generate_nonce_wasm()
      setResult('out-nonce', nonce, true)
      // Both prover (F) and verifier (G) must use the same nonce verbatim.
      document.getElementById('in-prove-nonce').value = nonce
      document.getElementById('in-vown-nonce').value = nonce
    } catch (e) {
      setResult('out-nonce', String(e), false)
    }
  })

  // F — Prove ownership
  document.getElementById('btn-prove').addEventListener('click', () => {
    try {
      const secretPrefixed = document.getElementById('in-prove-secret').value.trim()
      const electionId = document.getElementById('in-prove-election').value.trim()
      const nonce = document.getElementById('in-prove-nonce').value.trim()

      const secretBytes = secret_key_from_prefixed_wasm(secretPrefixed)
      const proof = prove_ownership_wasm(secretBytes, electionId, nonce)
      const publicKey = derive_public_key_wasm(secretBytes)
      secretBytes.fill(0)

      setResult('out-prove', proof, true)

      // Pre-fill the verifier (G) with this proof and the public inputs.
      document.getElementById('in-vown-public').value = publicKey
      document.getElementById('in-vown-election').value = electionId
      document.getElementById('in-vown-nonce').value = nonce
      document.getElementById('in-vown-proof').value = proof
    } catch (e) {
      setResult('out-prove', String(e), false)
    }
  })

  // H — Benchmark
  document.getElementById('btn-benchmark').addEventListener('click', () => {
    const btn = document.getElementById('btn-benchmark')
    btn.disabled = true
    setResult('out-benchmark', 'En cours…')

    setTimeout(() => {
      try {
        const idCount = Math.max(1, parseInt(document.getElementById('bench-id-count').value, 10))
        const payloadSize = Math.max(16, parseInt(document.getElementById('bench-payload-size').value, 10))
        const ringSize = Math.max(2, parseInt(document.getElementById('bench-ring-size').value, 10))

        const lines = []

        // 1 — Génération d'identités
        const t0 = performance.now()
        const identities = []
        for (let i = 0; i < idCount; i++) {
          const [sb, pk] = generate_identity_wasm()
          const sp = secret_key_to_prefixed_wasm(sb)
          sb.fill(0)
          identities.push({ secretPrefixed: sp, publicKey: pk })
        }
        const genMs = performance.now() - t0
        lines.push(`Génération identités  ×${idCount}   : ${genMs.toFixed(2)} ms total  |  ${(genMs / idCount).toFixed(3)} ms/op`)

        // Prépare le ring (génère des membres supplémentaires si ringSize > idCount)
        const ringMembers = identities.slice(0, ringSize)
        for (let i = identities.length; i < ringSize; i++) {
          const [sb, pk] = generate_identity_wasm()
          const sp = secret_key_to_prefixed_wasm(sb)
          sb.fill(0)
          ringMembers.push({ secretPrefixed: sp, publicKey: pk })
        }
        const ring = ringMembers.map(m => m.publicKey)
        const signer = ringMembers[0]

        // Construit un payload JSON d'environ payloadSize octets
        const padding = 'x'.repeat(Math.max(0, payloadSize - 14))
        const vote = JSON.stringify({ d: padding }).slice(0, payloadSize)
        const electionId = 'bench-election-2026'

        // 2 — Signature
        const t2 = performance.now()
        const secretBytes = secret_key_from_prefixed_wasm(signer.secretPrefixed)
        const [signatureHex, keyImageHex] = sign_vote_str_wasm(secretBytes, vote, electionId, ring)
        secretBytes.fill(0)
        const signMs = performance.now() - t2
        lines.push(`Signature ring        ×1          : ${signMs.toFixed(2)} ms  (ring=${ringSize}, payload≈${vote.length}B)`)

        // 3 — Vérification
        const t3 = performance.now()
        const valid = verify_vote_str_wasm(vote, electionId, signatureHex, keyImageHex, ring)
        const verifyMs = performance.now() - t3
        lines.push(`Vérification ring     ×1          : ${verifyMs.toFixed(2)} ms  (ring=${ringSize}) — ${valid ? 'VALID ✓' : 'INVALID ✗'}`)

        setResult('out-benchmark', lines.join('\n'), true)
      } catch (e) {
        setResult('out-benchmark', String(e), false)
      } finally {
        btn.disabled = false
      }
    }, 20)
  })

  // G — Verify ownership
  document.getElementById('btn-vown').addEventListener('click', () => {
    try {
      const publicKey = document.getElementById('in-vown-public').value.trim()
      const keyImage = document.getElementById('in-vown-ki').value.trim()
      const electionId = document.getElementById('in-vown-election').value.trim()
      const nonce = document.getElementById('in-vown-nonce').value.trim()
      const proof = document.getElementById('in-vown-proof').value.trim()

      const valid = verify_ownership_wasm(publicKey, keyImage, electionId, nonce, proof)
      setResult('out-vown', valid ? 'Ownership proof is VALID' : 'Ownership proof is INVALID', valid)
    } catch (e) {
      setResult('out-vown', String(e), false)
    }
  })
}

// Instantiate the WASM once, then enable the UI.
try {
  await init()
  wireUp()
  status.textContent = 'WASM ready — interact with the functions below'
  status.style.background = '#d4edda'
  status.style.borderColor = '#28a745'
} catch (e) {
  status.textContent = 'WASM init failed: ' + e
  status.style.background = '#f8d7da'
  status.style.borderColor = '#dc3545'
}
