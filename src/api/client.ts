/**
 * API 请求基础模块
 * 基于 axios 封装，自动携带 JWT token，处理 401 过期
 */
import axios from 'axios'
import { STORAGE_KEYS } from '@/utils/storage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.token || null
    }
  } catch {
    // ignore
  }
  return null
}

const instance = axios.create({
  baseURL: BASE_URL,
})

// 请求拦截器：自动注入 token
instance.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理 401 过期
instance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // 登录/注册接口的 401 是正常业务错误（账号未注册/密码错误），不透传拦截器
      const isAuthRequest = error.config?.url?.includes('/api/auth/')
      if (!isAuthRequest) {
        localStorage.removeItem(STORAGE_KEYS.user)
        window.location.href = '/login'
      }
    }
    const message = error.response?.data?.error || error.message || '请求失败'
    return Promise.reject(new Error(message))
  },
)

export async function apiGet<T>(path: string): Promise<T> {
  const res = await instance.get<T>(path)
  return res.data
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await instance.post<T>(path, body)
  return res.data
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await instance.put<T>(path, body)
  return res.data
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await instance.delete<T>(path)
  return res.data
}

export { BASE_URL, instance }
