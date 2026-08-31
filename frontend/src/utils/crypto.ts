import { apiRequest } from './api'

const DB_NAME = 'KiasuCodeE2EE'
const STORE_NAME = 'crypto_keys'
const DB_VERSION = 1

interface EncryptedPayload {
  k: string // RSA-OAEP encrypted AES key (base64)
  iv: string // AES-GCM initialization vector (base64)
  c: string // AES-GCM encrypted ciphertext (base64)
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Open IndexedDB database
function openCryptoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Save private key in IndexedDB
async function storePrivateKeyInDb(userId: string, key: CryptoKey): Promise<void> {
  const db = await openCryptoDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(key, `priv_${userId}`)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Retrieve private key from IndexedDB
async function getPrivateKeyFromDb(userId: string): Promise<CryptoKey | null> {
  const db = await openCryptoDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(`priv_${userId}`)

    request.onsuccess = () => {
      resolve(request.result ? (request.result as CryptoKey) : null)
    }
    request.onerror = () => reject(request.error)
  })
}

// Import a Base64-encoded SPKI public key
export async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const spkiBuffer = base64ToBuffer(publicKeyBase64)

  return await window.crypto.subtle.importKey(
    'spki',
    spkiBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt'],
  )
}

/**
 * Generate or load RSA-OAEP public/private keypair for the current user.
 * Private key stays in local IndexedDB; Public key is registered on the backend.
 */
export async function ensureUserKeyPair(userId: string): Promise<{ publicKey: string; privateKey: CryptoKey }> {
  const existingPrivateKey = await getPrivateKeyFromDb(userId).catch(() => null)

  if (existingPrivateKey) {
    // If public key is saved in localStorage, return it
    const storedPub = localStorage.getItem(`kiasu_pub_${userId}`)
    if (storedPub) {
      // Proactively ensure backend has it registered
      void apiRequest('/api/user/public-key', {
        method: 'PUT',
        body: JSON.stringify({ publicKey: storedPub }),
      }).catch(() => undefined)

      return {
        publicKey: storedPub,
        privateKey: existingPrivateKey,
      }
    }
  }

  // Generate new RSA-OAEP 2048-bit key pair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  )

  // Save private key in IndexedDB
  await storePrivateKeyInDb(userId, keyPair.privateKey)

  // Export public key as Base64 SPKI
  const spki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
  const publicKeyBase64 = bufferToBase64(spki)

  localStorage.setItem(`kiasu_pub_${userId}`, publicKeyBase64)

  // Send public key to backend
  await apiRequest('/api/user/public-key', {
    method: 'PUT',
    body: JSON.stringify({ publicKey: publicKeyBase64 }),
  }).catch((err) => {
    console.warn('Failed to upload public key to backend:', err)
  })

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
  }
}

/**
 * Encrypts a plaintext string using the recipient's RSA-OAEP public key.
 * Uses hybrid AES-GCM + RSA-OAEP encryption to support arbitrary text length.
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyBase64: string,
): Promise<string> {
  const recipientKey = await importPublicKey(recipientPublicKeyBase64)

  // 1. Generate ephemeral 256-bit AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )

  // 2. Encrypt plaintext with AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encodedText = new TextEncoder().encode(plaintext)
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encodedText,
  )

  // 3. Export and encrypt the AES key with recipient's RSA-OAEP public key
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey)
  const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientKey,
    rawAesKey,
  )

  // 4. Bundle payload into base64 JSON
  const payload: EncryptedPayload = {
    k: bufferToBase64(encryptedKeyBuffer),
    iv: bufferToBase64(iv),
    c: bufferToBase64(ciphertextBuffer),
  }

  return window.btoa(JSON.stringify(payload))
}

/**
 * Decrypts an encrypted message string using the current user's local private key.
 */
export async function decryptMessage(
  encryptedString: string,
  userId: string,
): Promise<string> {
  try {
    const privateKey = await getPrivateKeyFromDb(userId)
    if (!privateKey) {
      return '[⚠️ Unable to decrypt: Private key not found on this device]'
    }

    // Decode bundle
    const jsonString = window.atob(encryptedString)
    const payload = JSON.parse(jsonString) as EncryptedPayload

    if (!payload.k || !payload.iv || !payload.c) {
      // Fallback for direct RSA encryption if applicable
      const directCipherBuffer = base64ToBuffer(encryptedString)
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        directCipherBuffer,
      )
      return new TextDecoder().decode(decrypted)
    }

    // 1. Decrypt AES key using RSA-OAEP private key
    const encryptedKeyBuffer = base64ToBuffer(payload.k)
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedKeyBuffer,
    )

    // 2. Import raw AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    // 3. Decrypt ciphertext
    const ivBuffer = base64ToBuffer(payload.iv)
    const ciphertextBuffer = base64ToBuffer(payload.c)
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
      aesKey,
      ciphertextBuffer,
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    console.warn('Decryption error:', error)
    return '[🔒 Encrypted Message (Cannot be decrypted on this device)]'
  }
}
