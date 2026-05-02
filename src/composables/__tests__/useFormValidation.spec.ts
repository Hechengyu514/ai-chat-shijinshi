import { describe, it, expect, vi } from 'vitest'
import { useFormValidation } from '../useFormValidation'

describe('useFormValidation', () => {
  const { phoneRule, passwordRule, confirmPasswordRule } = useFormValidation()

  describe('phoneRule', () => {
    it('requires a value', () => {
      const requiredRule = phoneRule.find((r) => r.required)
      expect(requiredRule).toBeDefined()
      expect(requiredRule?.message).toBe('请输入手机号码')
    })

    it('validates phone pattern', () => {
      const patternRule = phoneRule.find((r) => r.pattern)
      expect(patternRule).toBeDefined()
      const regex = patternRule!.pattern as RegExp

      expect(regex.test('13812348888')).toBe(true)
      expect(regex.test('12345678901')).toBe(false) // invalid prefix
      expect(regex.test('1381234888')).toBe(false) // too short
    })
  })

  describe('passwordRule', () => {
    it('requires a value', () => {
      expect(passwordRule[0]?.required).toBe(true)
      expect(passwordRule[0]?.message).toBe('请输入密码')
    })
  })

  describe('confirmPasswordRule', () => {
    it('validates that two passwords match', () => {
      const rules = confirmPasswordRule({ password: 'abc123' })
      const validatorRule = rules.find((r) => r.validator)
      expect(validatorRule).toBeDefined()

      const callback = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(validatorRule!.validator as any)(null, 'abc123', callback)
      expect(callback).toHaveBeenCalledWith()

      const callbackErr = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(validatorRule!.validator as any)(null, 'wrong', callbackErr)
      expect(callbackErr).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})