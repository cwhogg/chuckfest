/** Random URL-safe token for personal links. */
export function newToken(bytes = 24): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return Buffer.from(buf).toString('base64url')
}
