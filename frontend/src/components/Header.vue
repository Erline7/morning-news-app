<template>
  <header class="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md sticky top-0 z-20 flex-shrink-0 transition-colors">
    <div class="text-gray-500 dark:text-gray-400 font-medium text-sm flex items-center">
      <span v-if="activeTab === 'chat'" class="flex items-center">
        <MessageSquare :size="16" class="mr-2" />AI Assistant
      </span>
      <span v-else-if="activeTab === 'content'" class="flex items-center">
        <BookOpen :size="16" class="mr-2" />Content Library
      </span>
      <span v-else-if="activeTab === 'notes'" class="flex items-center">
        <StickyNote :size="16" class="mr-2" />Notes
      </span>
      <span v-else-if="activeTab === 'subscriptions'" class="flex items-center">
        <Rss :size="16" class="mr-2" />Subscriptions
      </span>
      <span v-else-if="activeTab === 'report'" class="flex items-center">
        <ClipboardList :size="16" class="mr-2" />Daily Report
      </span>
      <span v-else-if="activeTab === 'timeline'" class="flex items-center">
        <Clock :size="16" class="mr-2" />每日记录
      </span>
      <span v-else class="flex items-center">
        <Home :size="16" class="mr-2" />Dashboard
      </span>
    </div>
    <div class="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
      <span>{{ displayDate }}</span>
      <div class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] p-1.5 rounded-lg transition-colors">
        <div class="w-7 h-7 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-xs">M</div>
        <span class="font-medium text-gray-800 dark:text-gray-200">Admin</span>
      </div>
      <div class="flex items-center space-x-4 border-l border-gray-200 dark:border-gray-800 pl-4">
        <button @click="$emit('toggle-dark')" class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center">
          <Sun v-if="isDarkMode" :size="18" class="text-yellow-500 fill-current" />
          <Moon v-else :size="18" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Home, BookOpen, MessageSquare, StickyNote, Rss, ClipboardList, Clock, Moon, Sun } from 'lucide-vue-next';

defineProps({
  activeTab: { type: String, default: 'brief' },
  activeFilter: { type: String, default: '全部' },
  displayDate: { type: String, default: '' },
  isDarkMode: { type: Boolean, default: false },
});

defineEmits(['toggle-dark']);
</script>
