import { apiRequest } from './api'

const DB_NAME = 'KiasuCodeE2EE'
const STORE_NAME = 'crypto_keys'
const DB_VERSION = 1

interface EncryptedPayload {
  k: string // RSA-OAEP encrypted AES key (base64)
  iv: string // AES-GCM initialization vector (base64)
  c: string // AES-GCM encrypted ciphertext (base64)
}

interface WrappedKeyPayload {
  v: number // version
  iv: string // AES-GCM IV (base64)
  salt: string // PBKDF2 salt (base64)
  data: string // AES-GCM encrypted PKCS#8 bytes (base64)
}

export interface EscrowKeyStatus {
  hasLocalKey: boolean
  hasEscrowedKey: boolean
  wrappedPrivateKey: string | null
  publicKey: string | null
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
export async function storePrivateKeyInDb(userId: string, key: CryptoKey): Promise<void> {
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
export async function getPrivateKeyFromDb(userId: string): Promise<CryptoKey | null> {
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

// Check if local private key exists
export async function hasLocalPrivateKey(userId: string): Promise<boolean> {
  try {
    const key = await getPrivateKeyFromDb(userId)
    return key !== null
  } catch {
    return false
  }
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
 * Derives an AES-GCM 256-bit encryption key from a user-provided Sync PIN using PBKDF2.
 */
async function derivePinKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const pinBytes = new TextEncoder().encode(pin)
  const pinKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    pinBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    pinKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Wraps (encrypts) the user's RSA-OAEP private key using a key derived from a 6-digit Sync PIN.
 */
export async function wrapPrivateKeyWithPin(
  privateKey: CryptoKey,
  pin: string,
): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  const aesKey = await derivePinKey(pin, salt)

  // Export private key to PKCS#8 ArrayBuffer
  const pkcs8Buffer = await window.crypto.subtle.exportKey('pkcs8', privateKey)

  // Encrypt with AES-GCM
  const encryptedBytes = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    pkcs8Buffer,
  )

  const payload: WrappedKeyPayload = {
    v: 1,
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    data: bufferToBase64(encryptedBytes),
  }

  return window.btoa(JSON.stringify(payload))
}

/**
 * Unwraps (decrypts) an escrowed private key using the Sync PIN and imports it into IndexedDB.
 */
export async function unwrapPrivateKeyWithPin(
  wrappedKeyBase64: string,
  pin: string,
  userId: string,
): Promise<CryptoKey> {
  const jsonString = window.atob(wrappedKeyBase64)
  const payload = JSON.parse(jsonString) as WrappedKeyPayload

  if (!payload.iv || !payload.salt || !payload.data) {
    throw new Error('Invalid wrapped key payload.')
  }

  const iv = new Uint8Array(base64ToBuffer(payload.iv))
  const salt = new Uint8Array(base64ToBuffer(payload.salt))
  const encryptedBytes = base64ToBuffer(payload.data)

  const aesKey = await derivePinKey(pin, salt)

  try {
    const pkcs8Buffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedBytes,
    )

    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      pkcs8Buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt'],
    )

    await storePrivateKeyInDb(userId, privateKey)
    return privateKey
  } catch {
    throw new Error('Incorrect Sync PIN. Please check your 6-digit PIN and try again.')
  }
}

/**
 * Queries the backend for escrowed key status.
 */
export async function checkEscrowStatus(userId: string): Promise<EscrowKeyStatus> {
  const hasLocal = await hasLocalPrivateKey(userId)

  try {
    const res = await apiRequest<{ wrappedPrivateKey: string | null; publicKey: string | null }>(
      '/api/user/wrapped-private-key',
    )

    return {
      hasLocalKey: hasLocal,
      hasEscrowedKey: Boolean(res.data.wrappedPrivateKey),
      wrappedPrivateKey: res.data.wrappedPrivateKey,
      publicKey: res.data.publicKey,
    }
  } catch {
    return {
      hasLocalKey: hasLocal,
      hasEscrowedKey: false,
      wrappedPrivateKey: null,
      publicKey: null,
    }
  }
}

/**
 * Escrows the current user's local private key to the backend using a Sync PIN.
 */
export async function escrowPrivateKeyWithPin(userId: string, pin: string): Promise<void> {
  const privateKey = await getPrivateKeyFromDb(userId)
  if (!privateKey) {
    throw new Error('No local private key found on this device to backup.')
  }

  const wrappedKeyBase64 = await wrapPrivateKeyWithPin(privateKey, pin)

  await apiRequest('/api/user/wrapped-private-key', {
    method: 'PUT',
    body: JSON.stringify({ wrappedPrivateKey: wrappedKeyBase64 }),
  })
}

/**
 * Generate or load RSA-OAEP public/private keypair for the current user.
 */
export async function ensureUserKeyPair(
  userId: string,
  backupPin?: string,
): Promise<{ publicKey: string; privateKey: CryptoKey }> {
  const existingPrivateKey = await getPrivateKeyFromDb(userId).catch(() => null)

  if (existingPrivateKey) {
    const storedPub = localStorage.getItem(`kiasu_pub_${userId}`)
    if (storedPub) {
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

  // If a backup PIN was provided during key generation, escrow immediately
  if (backupPin) {
    try {
      const wrapped = await wrapPrivateKeyWithPin(keyPair.privateKey, backupPin)
      await apiRequest('/api/user/wrapped-private-key', {
        method: 'PUT',
        body: JSON.stringify({ wrappedPrivateKey: wrapped }),
      })
    } catch (escrowErr) {
      console.warn('Failed to escrow wrapped key:', escrowErr)
    }
  }

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
  }
}

/**
 * Encrypts a plaintext string using the recipient's RSA-OAEP public key.
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
      return '[🔒 Locked Message: Enter your Sync PIN to decrypt history on this device]'
    }

    // Decode bundle
    const jsonString = window.atob(encryptedString)
    const payload = JSON.parse(jsonString) as EncryptedPayload

    if (!payload.k || !payload.iv || !payload.c) {
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
