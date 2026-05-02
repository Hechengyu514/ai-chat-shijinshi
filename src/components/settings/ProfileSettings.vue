<script setup lang="ts">
/**
 * 个人信息设置组件
 * 管理用户头像、用户名、手机号等个人信息。支持两种模式：
 * - batch（默认）：emit save 事件，由父组件统一提交
 * - immediate：每次修改直接调 API 保存
 */
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { User } from '@element-plus/icons-vue'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import { useAvatarUpload } from '@/composables/useAvatarUpload'
import { updateProfileApi } from '@/api/auth'
import { logger } from '@/utils/logger'
import { maskPhone as formatPhone } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    immediate?: boolean
  }>(),
  { immediate: false },
)

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const { updateUserInfo } = userStore

const editingUsername = ref(false)
const tempUsername = ref(userInfo.value.username)

const { cropperVisible, selectedFile, avatarPreview, handleFileSelect, handleCropped } =
  useAvatarUpload(
    props.immediate
      ? async (dataUrl) => {
          try {
            const result = await updateProfileApi({ avatar: dataUrl })
            updateUserInfo(result.user)
            ElMessage.success('头像已更新')
          } catch (error) {
            logger.error('更新头像失败:', error)
          }
        }
      : () => {},
  )

const emit = defineEmits<{
  save: [updates: Partial<typeof userInfo.value>]
}>()

const currentAvatar = computed(() => {
  return avatarPreview.value || userInfo.value.avatar || ''
})

const saveUsername = async (value: string) => {
  if (props.immediate) {
    try {
      const result = await updateProfileApi({ username: value })
      updateUserInfo(result.user)
      ElMessage.success('用户名已更新')
    } catch (error) {
      logger.error('更新用户名失败:', error)
      ElMessage.error('用户名更新失败，请重试')
      tempUsername.value = userInfo.value.username
    }
  }
}

const saveChanges = async () => {
  const updates: Partial<typeof userInfo.value> = {}

  if (tempUsername.value !== userInfo.value.username) {
    updates.username = tempUsername.value
  }

  if (avatarPreview.value) {
    updates.avatar = avatarPreview.value
  }

  if (props.immediate) {
    if (updates.username) await saveUsername(updates.username)
  } else {
    emit('save', updates)
  }

  editingUsername.value = false
}

const cancelEdit = () => {
  tempUsername.value = userInfo.value.username
  editingUsername.value = false
}

const onSaveSuccess = () => {
  avatarPreview.value = ''
  tempUsername.value = userInfo.value.username
}

const hasChanges = computed(() => {
  return avatarPreview.value || tempUsername.value !== userInfo.value.username
})

const displayPhone = computed(() => {
  const phone = userInfo.value.phone
  if (!phone || phone.length !== 11) return '未绑定'
  return formatPhone(phone)
})

defineExpose({
  hasChanges,
  saveChanges,
  cancelEdit,
  onSaveSuccess,
})
</script>

<template>
  <div class="settings-section">
    <div class="section-title">
      <el-icon><User /></el-icon>
      <span>个人信息</span>
    </div>

    <div class="avatar-section">
      <div class="avatar-wrapper">
        <div
          class="avatar"
          :style="{ backgroundImage: currentAvatar ? `url(${currentAvatar})` : 'none' }"
        >
          <span v-if="!currentAvatar">{{ userInfo.username.charAt(0) || 'U' }}</span>
        </div>
        <label class="avatar-upload-btn">
          <el-icon><User /></el-icon>
          <input type="file" accept="image/*" @change="handleFileSelect" />
        </label>
      </div>
      <p class="avatar-hint">点击上传头像（建议尺寸：200x200）</p>
    </div>

    <div class="form-item">
      <label class="form-label">用户名</label>
      <div class="form-value-wrapper">
        <template v-if="editingUsername">
          <el-input
            v-model="tempUsername"
            class="edit-input"
            @blur="saveChanges"
            @keyup.enter="saveChanges"
            @keyup.esc="cancelEdit"
            autofocus
          />
        </template>
        <template v-else>
          <span class="form-value">{{ userInfo.username || '未设置' }}</span>
          <el-button type="text" size="small" @click="editingUsername = true">编辑</el-button>
        </template>
      </div>
    </div>

    <div class="form-item">
      <label class="form-label">手机号码</label>
      <span class="form-value">{{ displayPhone }}</span>
    </div>
  </div>

  <AvatarCropper v-model:visible="cropperVisible" :file="selectedFile" @confirm="handleCropped" />
</template>

<style scoped>
.settings-section {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
  font-weight: 600;
  background-size: cover;
  background-position: center;
  border: 3px solid var(--border-color);
  transition: border-color 0.2s;
}

.avatar:hover {
  border-color: var(--primary-color);
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  border: 3px solid var(--card-bg);
  transition: background-color 0.2s;
}

.avatar-upload-btn:hover {
  background-color: var(--primary-hover-color);
}

.avatar-upload-btn input {
  display: none;
}

.avatar-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.form-value-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-value {
  font-size: 14px;
  color: var(--text-color);
}

.edit-input {
  width: 150px;
}
</style>
