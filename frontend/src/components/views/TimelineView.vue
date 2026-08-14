<template>
  <main class="max-w-5xl mx-auto px-8 md:px-12 py-12 h-full overflow-y-auto">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">每日记录</h2>
      <button
        @click="$emit('refresh')"
        class="flex items-center px-4 py-2 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] transition-colors shadow-sm"
      >
        <RefreshCw :size="16" class="mr-2" />
        刷新
      </button>
    </div>

    <!-- 活跃脉络卡片 -->
    <div v-if="activeThreads.length > 0" class="mb-8">
      <div class="flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
        <Zap :size="16" class="mr-2" />
        你正在思考
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="thread in activeThreads"
          :key="thread.id"
          class="bg-white dark:bg-[#1A1A1A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="w-2 h-2 rounded-full mr-2" :class="getThreadStatusColor(thread.status)"></div>
              <span class="font-semibold text-gray-900 dark:text-white">{{ thread.theme }}</span>
            </div>
            <span class="text-xs text-gray-400 dark:text-gray-500">{{ getThreadDays(thread) }}天</span>
          </div>
          <p v-if="thread.summary" class="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">{{ thread.summary }}</p>
          <div v-if="thread.suggestedNext" class="flex items-center text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-lg">
            <Sparkles :size="12" class="mr-1.5" />
            {{ thread.suggestedNext }}
          </div>
        </div>
      </div>
    </div>

    <!-- AI 今日叙事 -->
    <div v-if="analysis && analysis.narrative" class="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30">
      <div class="flex items-center text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3">
        <Sparkles :size="16" class="mr-2" />
        今日叙事
      </div>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{{ analysis.narrative }}</p>
    </div>

    <!-- 时间线 -->
    <div class="mb-8">
      <div class="flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
        <Clock :size="16" class="mr-2" />
        行为时间线
      </div>
      <div v-if="events.length === 0" class="text-center py-12 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800">
        <Clock :size="40" class="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p class="text-gray-500 dark:text-gray-400 text-sm">今天还没有记录任何行为</p>
      </div>
      <div v-else class="relative">
        <div class="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>
        <div v-for="event in events" :key="event.id" class="relative pl-14 pb-6">
          <div class="absolute left-4 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#1A1A1A]" :class="getEventColor(event.type)"></div>
          <div class="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium" :class="getEventTextColor(event.type)">{{ getEventLabel(event.type) }}</span>
                <span v-if="event.refs?.threads?.length > 0" class="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">脉络</span>
              </div>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatEventTime(event.timestamp) }}</span>
            </div>
            <div class="text-sm text-gray-800 dark:text-gray-200 font-medium">{{ event.title }}</div>
            <p v-if="event.content" class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{{ event.content }}</p>
            <div v-if="event.tags?.length > 0" class="flex flex-wrap gap-1 mt-2">
              <span v-for="tag in event.tags" :key="tag" class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-gray-400 rounded">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 复盘问题 -->
    <div v-if="analysis && analysis.followUpQuestions?.length > 0" class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
      <div class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        <MessageSquare :size="16" class="mr-2" />
        今日复盘问题
      </div>
      <div class="space-y-3">
        <div v-for="(question, idx) in analysis.followUpQuestions" :key="idx" class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#222] rounded-xl">
          <span class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold">{{ idx + 1 }}</span>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ question }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { Zap, Sparkles, Clock, MessageSquare } from 'lucide-vue-next';

defineProps({
  events: { type: Array, default: () => [] },
  analysis: { type: Object, default: null },
  activeThreads: { type: Array, default: () => [] },
});

defineEmits(['refresh']);

const getEventLabel = (type) => {
  const labels = {
    article_read: '阅读', note_created: '笔记', note_edit: '编辑笔记',
    question_asked: '提问', article_starred: '收藏', category_edited: '分类'
  };
  return labels[type] || type;
};

const getEventColor = (type) => {
  const colors = {
    article_read: 'bg-blue-400', note_created: 'bg-emerald-400', note_edit: 'bg-emerald-300',
    question_asked: 'bg-amber-400', article_starred: 'bg-yellow-400', category_edited: 'bg-purple-400'
  };
  return colors[type] || 'bg-gray-400';
};

const getEventTextColor = (type) => {
  const colors = {
    article_read: 'text-blue-600 dark:text-blue-400', note_created: 'text-emerald-600 dark:text-emerald-400',
    note_edit: 'text-emerald-600 dark:text-emerald-400', question_asked: 'text-amber-600 dark:text-amber-400',
    article_starred: 'text-yellow-600 dark:text-yellow-400', category_edited: 'text-purple-600 dark:text-purple-400'
  };
  return colors[type] || 'text-gray-600';
};

const getThreadStatusColor = (status) => {
  if (status === 'active') return 'bg-emerald-500';
  if (status === 'decaying') return 'bg-amber-500';
  return 'bg-gray-400';
};

const getThreadDays = (thread) => {
  if (!thread.createdAt) return 0;
  return Math.floor((Date.now() - new Date(thread.createdAt).getTime()) / (24 * 60 * 60 * 1000)) + 1;
};

const formatEventTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};
</script>
