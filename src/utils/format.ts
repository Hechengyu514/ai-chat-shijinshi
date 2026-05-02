/**
 * 数据格式化工具函数
 * 提供常用的数据格式化功能，如手机号脱敏、时间格式化等
 */

/**
 * 手机号脱敏
 * @example 13812348888 → 138****8888
 */
export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

/**
 * 格式化时间戳为相对时间
 * - 当天 → HH:mm
 * - 昨天 → "昨天"
 * - 7天内 → "N天前"
 * - 更早 → yyyy-MM-dd
 */
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}
