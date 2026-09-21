<script setup lang="ts">
import { Bell, Connection, RefreshRight, Setting } from '@element-plus/icons-vue'

defineEmits<{ reset: [] }>()
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">
        <span class="brand-shield">安</span>
      </div>
      <div>
        <div class="brand-title">政务安保智能指挥平台</div>
        <div class="brand-subtitle">SECURITY INTELLIGENCE COMMAND</div>
      </div>
    </div>

    <nav class="top-nav" aria-label="主导航">
      <button class="nav-item active">任务中心</button>
      <button class="nav-item">会议协同</button>
      <button class="nav-item">作战编组</button>
      <button class="nav-item">态势总览</button>
    </nav>

    <div class="header-actions">
      <div class="system-state"><span class="state-dot" />系统在线</div>
      <el-tooltip content="重置演示数据" placement="bottom">
        <button class="icon-button" aria-label="重置演示" @click="$emit('reset')">
          <el-icon><RefreshRight /></el-icon>
        </button>
      </el-tooltip>
      <button class="icon-button" aria-label="消息">
        <el-icon><Bell /></el-icon><span class="notice-dot" />
      </button>
      <button class="icon-button" aria-label="设置"><el-icon><Setting /></el-icon></button>
      <div class="operator">
        <div class="operator-avatar"><el-icon><Connection /></el-icon></div>
        <div><strong>指挥席</strong><span>市局安保专班</span></div>
      </div>
    </div>
  </header>
</template>
