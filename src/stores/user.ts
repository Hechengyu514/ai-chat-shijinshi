/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserInfo } from '@/types'
import { safeStorage, STORAGE_KEYS } from '@/utils/storage'

export const useUserStore = defineStore(
  'user',
  () => {
    const isLoggedIn = ref<boolean>(false)
    const token = ref<string>('')

    const userInfo = ref<UserInfo>({
      username: '',
      avatar: '',
      phone: '',
    })

    const login = (user: UserInfo, jwtToken: string) => {
      isLoggedIn.value = true
      token.value = jwtToken
      userInfo.value = user
    }

    /**
     * 清除登录态（不负责导航和跨 store 清理，由调用方处理）
     */
    const logout = () => {
      isLoggedIn.value = false
      token.value = ''
      userInfo.value = { username: '', avatar: '', phone: '' }
    }

    /**
     * 更新用户信息
     */
    const updateUserInfo = (updates: Partial<UserInfo>) => {
      userInfo.value = { ...userInfo.value, ...updates }
    }

    return {
      isLoggedIn,
      token,
      userInfo,
      login,
      logout,
      updateUserInfo,
    }
  },
  {
    persist: {
      key: STORAGE_KEYS.user,
      storage: safeStorage,
    },
  },
)
