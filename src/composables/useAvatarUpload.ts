import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 头像上传裁剪流程：选文件 → 裁剪 → 保存
 * @param onCropped - 裁剪完成回调，默认直接写入 userStore
 */
export function useAvatarUpload(onCropped?: (dataUrl: string) => void) {
  const userStore = useUserStore()

  const cropperVisible = ref(false)
  const selectedFile = ref<File | null>(null)
  const avatarPreview = ref<string>('')

  const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    selectedFile.value = file
    cropperVisible.value = true
    input.value = ''
  }

  const handleCropped = (dataUrl: string) => {
    avatarPreview.value = dataUrl
    if (onCropped) {
      onCropped(dataUrl)
    } else {
      userStore.updateUserInfo({ avatar: dataUrl })
    }
  }

  return { cropperVisible, selectedFile, avatarPreview, handleFileSelect, handleCropped }
}
