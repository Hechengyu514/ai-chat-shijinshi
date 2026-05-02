<script setup lang="ts">
/**
 * 头像裁剪对话框组件
 * 支持拖拽平移、滚轮/滑块缩放、圆形裁剪，最终输出 200×200 JPEG
 */
import { ref, watch, computed, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  // 是否可见
  visible: boolean
  // 待裁剪的原始文件
  file: File | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  // 裁剪完成，携带 base64 data URL
  confirm: [dataUrl: string]
}>()

// 裁剪视口尺寸（px）
const CROP_SIZE = 320
// 输出尺寸（px）
const OUTPUT_SIZE = 200
// 最小缩放比例
const ZOOM_MIN = 0.2
// 最大缩放比例
const ZOOM_MAX = 5
// 步进按钮缩放步长
const ZOOM_STEP = 0.1

// 对话框容器引用（用于自动聚焦以响应键盘事件）
const dialogRef = ref<HTMLElement | null>(null)
// 裁剪视口容器引用
const containerRef = ref<HTMLElement | null>(null)
// 隐藏的 canvas 引用（用于导出裁剪结果）
const canvasRef = ref<HTMLCanvasElement | null>(null)
// 当前图片的 objectURL
const imageSrc = ref('')

// 图片原始宽度/高度
const imgNatural = ref({ w: 0, h: 0 })
// 图片 X 偏移（向左为正）
const offsetX = ref(0)
// 图片 Y 偏移（向上为正）
const offsetY = ref(0)
// 当前缩放比例
const zoom = ref(1)

// 是否正在拖拽
const dragging = ref(false)
// 拖拽起始状态
const dragStart = ref({ x: 0, y: 0, ox: 0, oy: 0 })

// 确认按钮加载状态
const isConfirming = ref(false)

// 加载文件为 objectURL，计算初始缩放和居中偏移
const loadImage = (file: File) => {
  const url = URL.createObjectURL(file)
  imageSrc.value = url
  const img = new Image()
  img.onload = () => {
    imgNatural.value = { w: img.naturalWidth, h: img.naturalHeight }
    const minSide = Math.min(img.naturalWidth, img.naturalHeight)
    zoom.value = CROP_SIZE / minSide
    offsetX.value = (img.naturalWidth * zoom.value - CROP_SIZE) / 2
    offsetY.value = (img.naturalHeight * zoom.value - CROP_SIZE) / 2
  }
  img.onerror = () => {
    ElMessage.error('图片加载失败，请重新选择')
    URL.revokeObjectURL(url)
    imageSrc.value = ''
    emit('update:visible', false)
  }
  img.src = url
}

// 监听文件变化：释放旧 objectURL，加载新图片
watch(
  () => props.file,
  (file) => {
    if (file) {
      if (imageSrc.value && imageSrc.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc.value)
      }
      loadImage(file)
    }
  },
)

// 监听对话框开关：关闭时释放 objectURL，打开时自动聚焦以响应键盘事件
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => dialogRef.value?.focus())
    } else {
      if (imageSrc.value && imageSrc.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc.value)
        imageSrc.value = ''
      }
    }
  },
)

// 图片内联样式：根据偏移和缩放计算 CSS transform
const imageStyle = computed(() => {
  const w = imgNatural.value.w * zoom.value
  const h = imgNatural.value.h * zoom.value
  return {
    width: w + 'px',
    height: h + 'px',
    transform: `translate(${-offsetX.value}px, ${-offsetY.value}px)`,
  }
})

// 限制偏移量，防止图片移出可视区域
const clampOffset = () => {
  const imgW = imgNatural.value.w * zoom.value
  const imgH = imgNatural.value.h * zoom.value
  offsetX.value = Math.max(0, Math.min(offsetX.value, imgW - CROP_SIZE))
  offsetY.value = Math.max(0, Math.min(offsetY.value, imgH - CROP_SIZE))
}

// 拖拽开始：记录起始坐标，挂载 window 级事件（支持拖出视口）
const onDragStart = (e: MouseEvent) => {
  e.preventDefault()
  dragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

// 拖拽移动：根据鼠标位移更新偏移量
const onDragMove = (e: MouseEvent) => {
  if (!dragging.value) return
  offsetX.value = dragStart.value.ox + (dragStart.value.x - e.clientX)
  offsetY.value = dragStart.value.oy + (dragStart.value.y - e.clientY)
}

// 清理拖拽监听器
const cleanupDragListeners = () => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  dragging.value = false
}

// 拖拽结束：移除 window 级事件，校正偏移
const onDragEnd = () => {
  cleanupDragListeners()
  clampOffset()
}

// 滚轮缩放：以光标位置为中心点进行缩放
const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.02 : 0.02
  const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.value + delta * zoom.value))

  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const ratio = newZoom / zoom.value
    offsetX.value = cx - ratio * (cx - offsetX.value)
    offsetY.value = cy - ratio * (cy - offsetY.value)
  }
  zoom.value = newZoom
  clampOffset()
}

// 滑块缩放
const onZoomChange = (val: number | number[]) => {
  zoom.value = Array.isArray(val) ? (val[0] ?? zoom.value) : val
  clampOffset()
}

// 步进放大
const zoomIn = () => {
  const newZoom = Math.min(ZOOM_MAX, zoom.value + ZOOM_STEP)
  if (newZoom !== zoom.value) {
    zoom.value = newZoom
    clampOffset()
  }
}

// 步进缩小
const zoomOut = () => {
  const newZoom = Math.max(ZOOM_MIN, zoom.value - ZOOM_STEP)
  if (newZoom !== zoom.value) {
    zoom.value = newZoom
    clampOffset()
  }
}

// 重置：恢复初始缩放和居中位置
const handleReset = () => {
  const minSide = Math.min(imgNatural.value.w, imgNatural.value.h)
  zoom.value = CROP_SIZE / minSide
  offsetX.value = (imgNatural.value.w * zoom.value - CROP_SIZE) / 2
  offsetY.value = (imgNatural.value.h * zoom.value - CROP_SIZE) / 2
}

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
}

// 确认裁剪：将裁剪区域渲染到 canvas，导出 base64 data URL
const handleConfirm = async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const img = new Image()
  img.src = imageSrc.value

  await new Promise<void>((resolve) => {
    if (img.complete) resolve()
    else img.onload = () => resolve()
  })

  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 圆形裁剪路径
  ctx.beginPath()
  ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2)
  ctx.clip()

  // 将裁剪框内图像绘制到 canvas
  const srcX = offsetX.value / zoom.value
  const srcY = offsetY.value / zoom.value
  const srcW = CROP_SIZE / zoom.value
  const srcH = CROP_SIZE / zoom.value

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  emit('confirm', dataUrl)
  emit('update:visible', false)
}

// 组件卸载时清理：释放 objectURL、移除拖拽监听
onUnmounted(() => {
  if (imageSrc.value && imageSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageSrc.value)
    imageSrc.value = ''
  }
  cleanupDragListeners()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ua-fade">
      <div v-if="visible" class="ua-overlay" @click.self="handleClose">
        <div class="ua-dialog" @click.stop @keydown.esc="handleClose" tabindex="-1" ref="dialogRef">
          <div class="ua-header">
            <h3>裁剪头像</h3>
          </div>

          <div class="ua-body">
            <div ref="containerRef" class="ua-viewport" @mousedown="onDragStart" @wheel="onWheel">
              <img
                v-if="imageSrc"
                :src="imageSrc"
                :style="imageStyle"
                class="ua-img"
                draggable="false"
                alt=""
              />
              <!-- 圆形镂空遮罩 -->
              <div class="ua-mask"></div>
              <!-- 圆环引导线 -->
              <div class="ua-circle"></div>
            </div>

            <div class="ua-zoom">
              <button class="ua-zoom-btn" :disabled="zoom <= ZOOM_MIN" @click="zoomOut">−</button>
              <el-slider
                :model-value="zoom"
                :min="ZOOM_MIN"
                :max="ZOOM_MAX"
                :step="0.01"
                class="ua-zoom-slider"
                @input="onZoomChange"
              />
              <button class="ua-zoom-btn" :disabled="zoom >= ZOOM_MAX" @click="zoomIn">＋</button>
            </div>
          </div>

          <div class="ua-footer">
            <el-button @click="handleReset">重置</el-button>
            <div class="ua-footer-right">
              <el-button @click="handleClose">取消</el-button>
              <el-button type="primary" :loading="isConfirming" @click="handleConfirm">
                确认
              </el-button>
            </div>
          </div>
        </div>
        <canvas ref="canvasRef" class="ua-canvas-hidden"></canvas>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ua-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.ua-dialog {
  background-color: var(--card-bg);
  border-radius: 12px;
  width: 420px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.ua-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.ua-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.ua-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px;
}

/* 裁剪视口 */
.ua-viewport {
  position: relative;
  width: 320px;
  height: 320px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}

.ua-viewport:active {
  cursor: grabbing;
}

.ua-img {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

/* 圆形镂空遮罩 */
.ua-mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

/* 白色圆环引导线 */
.ua-circle {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

/* 缩放控制 */
.ua-zoom {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 320px;
}

.ua-zoom-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  user-select: none;
  transition: all 0.15s;
}

.ua-zoom-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.ua-zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ua-zoom-slider {
  flex: 1;
}

.ua-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ua-footer-right {
  display: flex;
  gap: 12px;
}

.ua-canvas-hidden {
  display: none;
}

.ua-fade-enter-active,
.ua-fade-leave-active {
  transition: opacity 0.25s ease;
}

.ua-fade-enter-from,
.ua-fade-leave-to {
  opacity: 0;
}
</style>
