<script setup lang="ts">
/**
 * 登录/注册页面
 * 提供用户认证功能，支持登录和注册两种模式切换
 */
import { ref, computed } from 'vue'
import type { FormInstance } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Lock, Iphone } from '@element-plus/icons-vue'
import { useFormValidation } from '@/composables/useFormValidation'
import { loginApi, registerApi } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()
const { passwordRule, registerPasswordRule, phoneRule, confirmPasswordRule } = useFormValidation()

const isLogin = ref(true)
const loading = ref(false)

const loginFormRef = ref<FormInstance | null>(null)
const registerFormRef = ref<FormInstance | null>(null)

// 登录字段级错误（服务端校验结果）
const loginPhoneError = ref('')
const loginPasswordError = ref('')
// 注册字段级错误
const registerPhoneError = ref('')
const registerPasswordError = ref('')

const clearLoginErrors = () => {
  loginPhoneError.value = ''
  loginPasswordError.value = ''
}
const clearRegisterErrors = () => {
  registerPhoneError.value = ''
  registerPasswordError.value = ''
}

const loginForm = ref({
  phone: '',
  password: '',
  agreeTerms: false,
})

const registerForm = ref({
  phone: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
})

// 注册表单验证规则
const rules = computed(() => ({
  phone: phoneRule,
  password: registerPasswordRule,
  confirmPassword: confirmPasswordRule(registerForm.value),
}))

const loginFormRules = {
  phone: phoneRule,
  password: passwordRule,
}

/**
 * 处理登录
 */
const handleLogin = async () => {
  if (!loginForm.value.agreeTerms) {
    ElMessage.warning('请先阅读并同意用户协议和隐私政策')
    return
  }
  clearLoginErrors()
  try {
    await loginFormRef.value?.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    const result = await loginApi(loginForm.value.phone, loginForm.value.password)
    userStore.login(result.user, result.token)
    ElMessage.success('登录成功！')
    router.push('/')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '登录失败'
    ElMessage.error({ message: msg, duration: 1000 })
    if (msg.includes('手机号码')) {
      loginPhoneError.value = '请输入正确的手机号码'
    } else if (msg.includes('密码')) {
      loginPasswordError.value = msg
    }
  } finally {
    loading.value = false
  }
}

/**
 * 处理注册
 */
const handleRegister = async () => {
  if (!registerForm.value.agreeTerms) {
    ElMessage.warning('请先阅读并同意用户协议和隐私政策')
    return
  }
  clearRegisterErrors()
  try {
    await registerFormRef.value?.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await registerApi(registerForm.value.phone, registerForm.value.password)
    ElMessage.success('注册成功！')
    // 切换到登录模式并自动填充
    isLogin.value = true
    loginForm.value.phone = registerForm.value.phone
    loginForm.value.password = registerForm.value.password
    loginForm.value.agreeTerms = true
    // 清空注册表单
    registerForm.value = {
      phone: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '注册失败'
    ElMessage.error({ message: msg, duration: 1000 })
    if (msg.includes('手机号')) {
      registerPhoneError.value = msg
    } else if (msg.includes('密码')) {
      registerPasswordError.value = msg
    }
  } finally {
    loading.value = false
  }
}

/**
 * 切换登录/注册模式
 */
const switchMode = () => {
  isLogin.value = !isLogin.value
  clearLoginErrors()
  clearRegisterErrors()
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2 class="title">{{ isLogin ? '登录' : '注册' }}</h2>
        <p class="subtitle">试金石小助手</p>
      </div>

      <el-form
        v-if="isLogin"
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginFormRules"
        class="login-form"
      >
        <el-form-item prop="phone" :error="loginPhoneError">
          <el-input
            v-model="loginForm.phone"
            placeholder="手机号码"
            size="large"
            :prefix-icon="Iphone"
            @input="loginPhoneError = ''"
          />
        </el-form-item>
        <el-form-item prop="password" :error="loginPasswordError">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @input="loginPasswordError = ''"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="loginForm.agreeTerms">
            我已阅读并同意 <a href="#" class="terms-link">用户协议</a> 和
            <a href="#" class="terms-link">隐私政策</a>
          </el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            :disabled="!loginForm.agreeTerms"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <el-form v-else ref="registerFormRef" :model="registerForm" :rules="rules" class="login-form">
        <el-form-item prop="phone" :error="registerPhoneError">
          <el-input
            v-model="registerForm.phone"
            placeholder="手机号码"
            size="large"
            :prefix-icon="Iphone"
            @input="registerPhoneError = ''"
          />
        </el-form-item>
        <el-form-item prop="password" :error="registerPasswordError">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @input="registerPasswordError = ''"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="registerForm.agreeTerms">
            我已阅读并同意 <a href="#" class="terms-link">用户协议</a> 和
            <a href="#" class="terms-link">隐私政策</a>
          </el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            :disabled="!registerForm.agreeTerms"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="switch-mode">
        <span>{{ isLogin ? '还没有账号？' : '已有账号？' }}</span>
        <el-button type="primary" link @click="switchMode">
          {{ isLogin ? '立即注册' : '去登录' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color);
}

.login-box {
  width: 420px;
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}

.login-form {
  margin-bottom: 24px;
}

.login-form .el-form-item {
  margin-bottom: 20px;
}

.submit-btn {
  width: 100%;
}

.switch-mode {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.switch-mode span {
  margin-right: 4px;
}

.terms-link {
  color: var(--primary-color);
}

:deep(.el-input__wrapper) {
  background-color: var(--card-bg);
  box-shadow: 0 0 0 1px var(--border-color);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--primary-color);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--primary-color);
}

:deep(.el-input__inner) {
  color: var(--text-color);
}

:deep(.el-input__inner::placeholder) {
  color: var(--placeholder-color);
}

:deep(.el-checkbox__label) {
  color: var(--text-secondary);
}

:deep(.el-checkbox__inner) {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

:deep(.el-checkbox.is-checked .el-checkbox__label) {
  color: var(--text-secondary);
}
</style>
