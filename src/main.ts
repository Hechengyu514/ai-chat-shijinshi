/**
 * 应用入口文件
 * 创建 Vue 应用实例并配置全局依赖
 */
import { createApp } from 'vue'

import App from './App.vue'
import pinia from './stores'
import router from './router'
import { getInitialTheme } from './stores/theme'

import '@/assets/styles/global.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

// 挂载前应用已保存的主题，避免亮/暗切换闪烁
if (getInitialTheme() === 'dark') {
  document.documentElement.classList.add('dark')
}

app.mount('#app')