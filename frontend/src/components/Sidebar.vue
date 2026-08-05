<template>
  <div class="w-64 bg-[#F8F9FA] dark:bg-[#1A1A1A] h-full flex flex-col border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-colors">
    <div class="h-16 flex items-center px-6 font-bold text-xl text-gray-900 dark:text-white">
      <div class="w-8 h-8 bg-[#2D3A5F] dark:bg-[#3D4F7C] rounded-lg flex items-center justify-center mr-3 text-white">
        <Layers :size="18" />
      </div>
      DailyBrief
    </div>

    <div class="flex-1 overflow-y-auto py-6 px-3">
      <button
        @click="$emit('navigate', 'brief')"
        class="w-full flex items-center px-3 py-2.5 rounded-lg mb-2 transition-colors text-left"
        :class="activeTab === 'brief' ? activeClass : inactiveClass"
      >
        <Home :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
        今日简报
      </button>

      <!-- Categories dropdown -->
      <div class="mb-2">
        <button
          @click="isCategoriesOpen = !isCategoriesOpen"
          class="w-full flex items-center justify-between px-3 py-2 text-gray-500 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-[#252525] rounded-lg text-left"
        >
          <div class="flex items-center">
            <BookOpen :size="18" class="mr-3" />
            内容
          </div>
          <ChevronDown :size="16" class="transition-transform duration-200" :class="{ 'transform rotate-180': isCategoriesOpen }" />
        </button>

        <div v-show="isCategoriesOpen" class="ml-9 mt-1 space-y-1">
          <button
            @click="$emit('navigate', 'content'); $emit('filter', '全部')"
            class="w-full px-3 py-2 text-sm rounded-lg flex justify-between items-center text-left transition-colors"
            :class="activeFilter === '全部' && activeTab === 'content' ? activeClass : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]'"
          >
            <span>全部内容</span>
            <span class="text-xs text-gray-400 dark:text-gray-500">{{ totalArticles }}</span>
          </button>
          <button
            v-for="stat in stats"
            :key="stat.label"
            @click="$emit('navigate', 'content'); $emit('filter', stat.label)"
            class="w-full px-3 py-1.5 text-sm rounded-lg flex justify-between items-center text-left transition-colors"
            :class="activeFilter === stat.label && activeTab === 'content' ? activeClass : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]'"
          >
            <span>{{ stat.label }}</span>
            <span class="text-xs text-gray-400 dark:text-gray-500">{{ stat.count }}</span>
          </button>
        </div>
      </div>

      <button
        @click="$emit('navigate', 'chat')"
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-4 transition-colors text-left"
        :class="activeTab === 'chat' ? activeClass : inactiveClass"
      >
        <div class="flex items-center">
          <MessageSquare :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
          AI Chat
        </div>
        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
      </button>

      <button
        @click="$emit('navigate', 'notes')"
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
        :class="activeTab === 'notes' ? activeClass : inactiveClass"
      >
        <div class="flex items-center">
          <StickyNote :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
          我的笔记
        </div>
        <span v-if="notesCount > 0" class="text-xs text-gray-400 dark:text-gray-500">{{ notesCount }}</span>
      </button>

      <button
        @click="$emit('navigate', 'subscriptions')"
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
        :class="activeTab === 'subscriptions' ? activeClass : inactiveClass"
      >
        <div class="flex items-center">
          <Rss :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
          我的链接
        </div>
        <span v-if="subscriptionsCount > 0" class="text-xs text-gray-400 dark:text-gray-500">{{ subscriptionsCount }}</span>
      </button>

      <button
        @click="$emit('navigate', 'report')"
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
        :class="activeTab === 'report' ? activeClass : inactiveClass"
      >
        <div class="flex items-center">
          <ClipboardList :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
          每日复盘
        </div>
      </button>

      <button
        @click="$emit('navigate', 'timeline')"
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
        :class="activeTab === 'timeline' ? activeClass : inactiveClass"
      >
        <div class="flex items-center">
          <Clock :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
          每日记录
        </div>
      </button>
    </div>

    <div class="p-6 border-t border-gray-200 dark:border-gray-800">
      <div class="text-xs text-gray-400 dark:text-gray-500 mb-1">历史收录</div>
      <div class="text-2xl font-serif text-gray-900 dark:text-white mb-1">
        {{ totalArticles }} <span class="text-sm font-sans text-gray-500 dark:text-gray-400 font-normal">篇</span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">横跨 {{ stats.length }} 个分类</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  Layers, Home, BookOpen, ChevronDown, MessageSquare,
  StickyNote, Rss, ClipboardList, Clock
} from 'lucide-vue-next';

const activeClass = 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium';
const inactiveClass = 'hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-400';

defineProps({
  activeTab: { type: String, default: 'brief' },
  activeFilter: { type: String, default: '全部' },
  totalArticles: { type: Number, default: 0 },
  notesCount: { type: Number, default: 0 },
  subscriptionsCount: { type: Number, default: 0 },
  stats: { type: Array, default: () => [] },
});

defineEmits(['navigate', 'filter']);

const isCategoriesOpen = ref(true);
</script>
