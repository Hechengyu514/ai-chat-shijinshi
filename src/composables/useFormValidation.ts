import { PHONE_REGEX } from '@/utils/validation'

/** 密码须包含至少一个字母和一个数字 */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)/

/**
 * 表单验证组合式函数
 * 提供通用的表单验证规则和验证器
 */
export function useFormValidation() {
  const phoneRule = [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: PHONE_REGEX, message: '请输入正确的手机号码', trigger: 'blur' },
  ]

  // 登录密码规则：仅校验非空
  const passwordRule = [{ required: true, message: '请输入密码', trigger: 'blur' }]

  // 注册密码规则：完整格式校验
  const registerPasswordRule = [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' },
    { max: 16, message: '密码长度不能超过 16 位', trigger: 'blur' },
    { pattern: PASSWORD_REGEX, message: '密码须包含至少一个字母和一个数字', trigger: 'blur' },
  ]

  /**
   * 确认密码验证规则（动态）
   * @param form - 包含 password 字段的表单对象
   * @returns 验证规则数组
   */
  const confirmPasswordRule = (form: { password: string }) => [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ]

  return {
    phoneRule,
    passwordRule,
    registerPasswordRule,
    confirmPasswordRule,
  }
}
