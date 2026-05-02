import { describe, it, expect } from 'vitest'
import { maskPhone, formatRelativeTime } from '../format'

describe('maskPhone', () => {
  it('masks middle 4 digits of a phone number', () => {
    expect(maskPhone('13812348888')).toBe('138****8888')
  })

  it('returns masked format for any valid phone', () => {
    expect(maskPhone('15800001111')).toBe('158****1111')
  })
})

describe('formatRelativeTime', () => {
  it('returns HH:mm for today', () => {
    const now = Date.now()
    const result = formatRelativeTime(now)
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns 昨天 for yesterday', () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000
    expect(formatRelativeTime(yesterday)).toBe('昨天')
  })

  it('returns N天前 for 2-6 days ago', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    expect(formatRelativeTime(threeDaysAgo)).toBe('3天前')
  })

  it('returns date string for 7+ days ago', () => {
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000
    const result = formatRelativeTime(tenDaysAgo)
    expect(result).toContain('/')
  })
})