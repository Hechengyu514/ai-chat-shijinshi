/**
 * 聊天状态管理
 * 包含对话列表、当前选中的对话ID、添加消息、创建新对话、取消选中对话、获取选中对话、重命名对话等功能
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, Conversation } from '@/types'
import { safeStorage, STORAGE_KEYS } from '@/utils/storage'
import { chatApi } from '@/api/chat'
import { logger } from '@/utils/logger'
import { generateId } from '@/utils/id'

export const useChatStore = defineStore(
  'chat',
  () => {
    const conversations = ref<Conversation[]>([])
    const activeConversationId = ref<string | null>(null)

    // 排序对话列表，置顶对话在前，最近更新时间在前
    const sortedConversations = computed(() => {
      return [...conversations.value].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return b.updatedAt - a.updatedAt
      })
    })

    // 添加消息到指定对话，更新对话的更新时间
    const addMessage = (conversationId: string, message: Message) => {
      const conversation = conversations.value.find((c) => c.id === conversationId)
      if (conversation) {
        conversation.messages.push(message)
        conversation.updatedAt = Date.now()
      }
    }

    // 创建新对话（本地，使用 UUID 避免碰撞）
    const createConversation = () => {
      const newConversation: Conversation = {
        id: generateId(),
        title: '新对话',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      conversations.value.unshift(newConversation)
      activeConversationId.value = newConversation.id
      return newConversation
    }

    // 添加一个已有对话到列表（用于从后端同步）
    const addConversation = (conversation: Conversation) => {
      conversations.value.unshift(conversation)
      activeConversationId.value = conversation.id
    }

    // 设置当前选中的对话
    const setActiveConversation = (id: string) => {
      activeConversationId.value = id
    }

    // 获取当前选中的对话。如果没有选中的对话，返回null
    const getActiveConversation = () => {
      if (!activeConversationId.value) return null
      return conversations.value.find((c) => c.id === activeConversationId.value) || null
    }

    // 取消选中当前对话，回到欢迎页（不删除对话，仅取消选中）
    const deselectConversation = () => {
      activeConversationId.value = null
    }

    // 置顶指定对话
    const pinConversation = (conversationId: string) => {
      const conversation = conversations.value.find((c) => c.id === conversationId)
      if (conversation) {
        conversation.isPinned = true
        conversation.updatedAt = Date.now()
        chatApi.updateConversation(conversationId, { isPinned: true }).catch((err) => {
          logger.error('置顶同步失败:', err)
        })
      }
    }

    // 取消置顶指定对话
    const unpinConversation = (conversationId: string) => {
      const conversation = conversations.value.find((c) => c.id === conversationId)
      if (conversation) {
        conversation.isPinned = false
        conversation.updatedAt = Date.now()
        chatApi.updateConversation(conversationId, { isPinned: false }).catch((err) => {
          logger.error('取消置顶同步失败:', err)
        })
      }
    }

    // 重命名指定对话
    const renameConversation = (conversationId: string, newTitle: string) => {
      const conversation = conversations.value.find((c) => c.id === conversationId)
      if (conversation) {
        conversation.title = newTitle
        chatApi.updateConversation(conversationId, { title: newTitle }).catch((err) => {
          logger.error('重命名同步失败:', err)
        })
      }
    }

    // 删除指定对话
    const deleteConversation = (conversationId: string) => {
      const index = conversations.value.findIndex((c) => c.id === conversationId)
      if (index !== -1) {
        conversations.value.splice(index, 1)
        if (activeConversationId.value === conversationId) {
          if (conversations.value.length > 0) {
            activeConversationId.value = conversations.value[0]!.id
          } else {
            activeConversationId.value = null
          }
        }
        chatApi.deleteConversation(conversationId).catch((err) => {
          logger.error('删除对话同步失败:', err)
        })
      }
    }

    // 删除所有对话
    const deleteAllConversations = () => {
      Promise.all(conversations.value.map((c) => chatApi.deleteConversation(c.id))).catch((err) =>
        logger.error('批量删除对话失败:', err),
      )
      conversations.value = []
      activeConversationId.value = null
    }

    // 对话列表同步缓存
    let lastSyncTime = 0
    const SYNC_CACHE_TTL = 30_000 // 30 秒内不重复请求

    // 从服务端同步对话列表，合并到本地
    const syncFromServer = async () => {
      if (Date.now() - lastSyncTime < SYNC_CACHE_TTL) return
      try {
        const serverList = await chatApi.fetchConversations()
        if (serverList.length === 0) return
        lastSyncTime = Date.now()
        // 以服务端数据为准：保留本地独有的消息内容，但元信息以服务端为准
        const localMap = new Map(conversations.value.map((c) => [c.id, c]))
        conversations.value = serverList.map((s) => {
          const local = localMap.get(s.id)
          return {
            id: s.id,
            title: s.title,
            isPinned: s.isPinned,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messages: local?.messages ?? [],
          }
        })
      } catch (err) {
        logger.error('同步对话列表失败:', err)
      }
    }

    return {
      conversations,
      sortedConversations,
      activeConversationId,
      addMessage,
      createConversation,
      addConversation,
      setActiveConversation,
      deselectConversation,
      getActiveConversation,
      syncFromServer,
      deleteAllConversations,
      renameConversation,
      pinConversation,
      unpinConversation,
      deleteConversation,
    }
  },

  // 持久化配置
  {
    persist: {
      key: STORAGE_KEYS.chat,
      storage: safeStorage,
      afterHydrate(ctx) {
        const state = ctx.store.$state
        if (
          state.activeConversationId &&
          !state.conversations.some((c: Conversation) => c.id === state.activeConversationId)
        ) {
          if (state.conversations.length > 0) {
            const first = state.conversations[0] as Conversation
            state.activeConversationId = first.id
          } else {
            state.activeConversationId = null
          }
        }
      },
    },
  },
)
