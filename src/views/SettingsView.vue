<script setup lang="ts">
/**
 * 设置页面
 * 管理用户个人信息、外观设置、账号安全等配置
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logger } from '@/utils/logger'
import { ArrowLeft, Check } from '@element-plus/icons-vue'
import { updateProfileApi } from '@/api/auth'
import ProfileSettings from '@/components/settings/ProfileSettings.vue'
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue'

const router = useRouter()
const userStore = useUserStore()

const profileSettingsRef = ref<InstanceType<typeof ProfileSettings> | null>(null)

const goBack = () => {
  router.back()
}

const saveChanges = () => {
  profileSettingsRef.value?.saveChanges()
}

const cancelEdit = () => {
  profileSettingsRef.value?.cancelEdit()
}

const handleSave = async (updates: Partial<typeof userStore.userInfo>) => {
  if (Object.keys(updates).length === 0) return
  try {
    const result = await updateProfileApi({
      username: updates.username,
      avatar: updates.avatar,
    })
    userStore.updateUserInfo(result.user)
    profileSettingsRef.value?.onSaveSuccess()
    ElMessage.success('个人资料已保存')
  } catch (error) {
    logger.error('保存个人资料失败:', error)
    userStore.updateUserInfo(updates)
    ElMessage.warning('数据仅保存在本地，重新登录后可能丢失')
  }
}

const hasChanges = computed(() => profileSettingsRef.value?.hasChanges || false)
</script>

<template>
  <div class="settings-container">
    <div class="settings-header">
      <el-button type="text" :icon="ArrowLeft" @click="goBack" class="back-btn" />
      <h1 class="page-title">个人设置</h1>
    </div>

    <div class="settings-content">
      <ProfileSettings ref="profileSettingsRef" @save="handleSave" />
      <AppearanceSettings />

      <div v-if="hasChanges" class="save-section">
        <el-button type="primary" :icon="Check" @click="saveChanges" class="save-btn">
          保存更改
        </el-button>
        <el-button type="text" @click="cancelEdit">取消</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
}

.back-btn {
  font-size: 20px;
  color: var(--text-secondary);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.settings-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.save-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  background-color: var(--card-bg);
  border-radius: 12px;
}

.save-btn {
  padding: 10px 32px;
}
</style>
