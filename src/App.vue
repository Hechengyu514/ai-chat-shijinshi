<script setup lang="ts">
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import GlobalErrorHandler from '@/components/common/GlobalErrorHandler.vue'
</script>

<template>
  <ErrorBoundary fallback-message="应用出现错误，请刷新页面重试">
    <router-view />
  </ErrorBoundary>
  <GlobalErrorHandler />
</template>
