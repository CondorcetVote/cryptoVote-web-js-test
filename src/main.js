// Standard consumer usage of the `--target web` build: import the async
// `init` (default export) plus the functions, await init once, then use them.
import init, {
  generate_identity_wasm,
  derive_public_key_wasm,
  is_valid_secret_key_wasm,
  sign_vote_str_wasm,
  verify_vote_str_wasm,
} from '@condorcet.vote/crypto-vote'

const status = document.getElementById('status')

function hexToBytes(hex) {
  if (hex.length !== 64) throw new Error(`Expected 64 hex chars, got ${hex.length}`)
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

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
      const [secretBytes, publicHex] = generate_identity_wasm()
      const secretHex = bytesToHex(secretBytes)
      secretBytes.fill(0)
      setResult('out-secret', secretHex)
      setResult('out-public', publicHex)
      document.getElementById('in-validate-secret').value = secretHex
      document.getElementById('in-derive-secret').value = secretHex
      document.getElementById('in-sign-secret').value = secretHex
      const ring = document.getElementById('in-sign-ring')
      if (!ring.value.includes(publicHex)) {
        ring.value = (ring.value ? ring.value + '\n' : '') + publicHex
      }
    } catch (e) {
      setResult('out-secret', String(e), false)
    }
  })

  // B — Validate secret key
  document.getElementById('btn-validate').addEventListener('click', () => {
    try {
      const hex = document.getElementById('in-validate-secret').value.trim()
      const bytes = hexToBytes(hex)
      const valid = is_valid_secret_key_wasm(bytes)
      bytes.fill(0)
      setResult('out-validate', valid ? 'Valid secret key' : 'Invalid secret key', valid)
    } catch (e) {
      setResult('out-validate', String(e), false)
    }
  })

  // C — Derive public key
  document.getElementById('btn-derive').addEventListener('click', () => {
    try {
      const hex = document.getElementById('in-derive-secret').value.trim()
      const bytes = hexToBytes(hex)
      const pubHex = derive_public_key_wasm(bytes)
      bytes.fill(0)
      setResult('out-derive', pubHex, true)
    } catch (e) {
      setResult('out-derive', String(e), false)
    }
  })

  // D — Sign vote
  document.getElementById('btn-sign').addEventListener('click', () => {
    try {
      const secretHex = document.getElementById('in-sign-secret').value.trim()
      const vote = document.getElementById('in-sign-vote').value
      const electionId = document.getElementById('in-sign-election').value.trim()
      const ring = parseRing(document.getElementById('in-sign-ring').value)

      if (ring.length < 2) throw new Error('Ring must have at least 2 public keys')

      const secretBytes = hexToBytes(secretHex)
      const [signatureHex, keyImageHex] = sign_vote_str_wasm(secretBytes, vote, electionId, ring)
      secretBytes.fill(0)

      setResult('out-sign-sig', signatureHex)
      setResult('out-sign-ki', keyImageHex)

      document.getElementById('in-verify-vote').value = vote
      document.getElementById('in-verify-election').value = electionId
      document.getElementById('in-verify-sig').value = signatureHex
      document.getElementById('in-verify-ki').value = keyImageHex
      document.getElementById('in-verify-ring').value = document.getElementById('in-sign-ring').value
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
