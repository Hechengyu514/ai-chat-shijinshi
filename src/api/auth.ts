/**
 * 认证 API：登录 + 注册 + 更新个人资料
 */
import { apiPost, apiPut } from './client'
import type { UserInfo } from '@/types'

interface AuthResponse {
  token: string
  user: UserInfo
}

/** 发送登录请求，返回 token 和用户信息 */
export async function loginApi(phone: string, password: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/login', { phone, password })
}

/** 发送注册请求，返回 token 和用户信息 */
export async function registerApi(phone: string, password: string): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/register', { phone, password })
}

/** 更新个人资料（用户名/头像），返回更新后的用户信息 */
export async function updateProfileApi(
  params: { username?: string; avatar?: string; phone?: string },
): Promise<{ user: UserInfo }> {
  return apiPut<{ user: UserInfo }>('/api/auth/profile', params)
}
