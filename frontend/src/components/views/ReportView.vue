<template>
  <main class="max-w-5xl mx-auto px-8 md:px-12 py-12">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">每日复盘</h2>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="flex items-center px-4 py-2 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] disabled:opacity-50 transition-colors shadow-sm"
      >
        <Loader2 v-if="isLoading" :size="16" class="mr-2 animate-spin" />
        <RefreshCw v-else :size="16" class="mr-2" />
        {{ isLoading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <div v-if="!report" class="text-center py-20">
      <ClipboardList :size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">今日还没有复盘报告</p>
    </div>

    <div v-else class="space-y-6">
      <!-- 概览卡片 -->
      <div class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ report.date }}</div>
        <div class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ report.summary }}</div>
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ report.questionCount || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">今日提问</div>
          </div>
          <div class="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
            <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ report.noteCount || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">今日笔记</div>
          </div>
          <div class="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ report.coreThemes?.length || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">核心主题</div>
          </div>
        </div>
      </div>

      <!-- 思考轴 -->
      <div v-if="report.thinkingAxis?.length > 0" class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          <GitBranch :size="16" class="mr-2" />
          今日思考轴
        </div>
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <div v-for="(node, idx) in report.thinkingAxis" :key="idx" class="flex items-center">
            <div class="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm rounded-lg whitespace-nowrap">{{ node }}</div>
            <ChevronRight v-if="idx < report.thinkingAxis.length - 1" :size="16" class="mx-1 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </div>

      <!-- 核心主题 -->
      <div v-if="report.coreThemes?.length > 0" class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          <Tag :size="16" class="mr-2" />
          核心关注主题
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-for="theme in report.coreThemes" :key="theme" class="px-3 py-1.5 bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 text-sm rounded-lg">{{ theme }}</span>
        </div>
      </div>

      <!-- AI 洞察 -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50">
        <div class="flex items-center text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">
          <Sparkles :size="16" class="mr-2" />
          今日洞察
        </div>
        <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{{ report.insight || '暂无洞察' }}</p>
        <div v-if="report.tomorrowSuggestion" class="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <div class="text-xs text-blue-600 dark:text-blue-400 mb-1">明日建议</div>
          <p class="text-gray-700 dark:text-gray-300 text-sm">{{ report.tomorrowSuggestion }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ClipboardList, RefreshCw, Loader2, GitBranch, Tag, Sparkles, ChevronRight } from 'lucide-vue-next';

defineProps({
  report: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
});

defineEmits(['refresh']);
</script>
