/**
 * 生成 UUID v4
 * crypto.randomUUID() 要求安全上下文（HTTPS / localhost），LAN HTTP 不可用。
 * 改用 crypto.getRandomValues()，兼容所有环境。
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) & 15 // 0–15
    const v = c === 'x' ? r : (r & 0x3) | 0x8 // y: 8, 9, a, b
    return v.toString(16)
  })
}
