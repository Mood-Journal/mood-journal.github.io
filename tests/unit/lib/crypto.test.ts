import { describe, it, expect, beforeEach } from 'vitest'
import { encryptString, decryptString, resetKeyForTesting } from '../../../src/lib/crypto'

beforeEach(() => {
  resetKeyForTesting()
})

describe('crypto', () => {
  it('round-trips a string', async () => {
    const plaintext = 'hello, world'
    const encrypted = await encryptString(plaintext)
    expect(encrypted).not.toBe(plaintext)
    const decrypted = await decryptString(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips a JSON string', async () => {
    const json = JSON.stringify([{ id: '1', date: '2026-05-26', level1: 'Happy' }])
    const encrypted = await encryptString(json)
    const decrypted = await decryptString(encrypted)
    expect(JSON.parse(decrypted)).toEqual(JSON.parse(json))
  })

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const plaintext = 'same input'
    const a = await encryptString(plaintext)
    const b = await encryptString(plaintext)
    expect(a).not.toBe(b)
  })

  it('throws when decrypting tampered ciphertext', async () => {
    const encrypted = await encryptString('data')
    const tampered = encrypted.slice(0, -4) + 'XXXX'
    await expect(decryptString(tampered)).rejects.toThrow()
  })
})
