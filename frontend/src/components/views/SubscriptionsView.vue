<template>
  <main class="max-w-5xl mx-auto px-8 md:px-12 py-12">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">我的链接</h2>
      <span class="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#222] px-3 py-1 rounded-full">{{ subscriptions.length }} 个链接</span>
    </div>

    <!-- Add URL -->
    <div class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">添加新链接</h3>
      <div class="flex gap-3">
        <input
          :value="customUrl"
          @input="$emit('update:custom-url', $event.target.value)"
          @keydown.enter="$emit('add-url')"
          placeholder="输入文章 URL..."
          class="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 dark:text-gray-200"
        />
        <button @click="$emit('add-url')" :disabled="!customUrl.trim() || isCheckingUrl" class="px-5 py-2.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] disabled:opacity-50 transition-colors">
          <Loader2 v-if="isCheckingUrl" :size="16" class="animate-spin" />
          <span v-else>抓取</span>
        </button>
      </div>

      <div v-if="urlCheckResult" class="mt-4 p-4 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-gray-700">
        <div v-if="urlCheckResult.success" class="space-y-2">
          <div class="flex items-start gap-2">
            <LinkIcon :size="16" class="text-blue-500 mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ urlCheckResult.title }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{{ urlCheckResult.url }}</p>
            </div>
          </div>
          <p v-if="urlCheckResult.summary" class="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{{ urlCheckResult.summary }}</p>
          <div class="flex gap-2 mt-3">
            <button @click="$emit('save-link-all')" class="px-3 py-1.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-xs rounded-lg hover:bg-[#1f2844]">保存到内容库</button>
            <button @click="urlCheckResult = null" class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-[#222]">取消</button>
          </div>
        </div>
        <div v-else class="text-sm text-red-500">
          <p class="font-medium">抓取失败</p>
          <p class="text-xs text-gray-500 mt-1">{{ urlCheckResult.error || '无法读取该网站' }}</p>
          <div class="flex gap-2 mt-3">
            <button @click="$emit('save-link-only')" class="px-3 py-1.5 bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300">仅保存链接</button>
            <button @click="urlCheckResult = null" class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-[#222]">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="subscriptions.length === 0" class="text-center py-20">
      <LinkIcon :size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <p class="text-gray-500 dark:text-gray-400 text-sm">还没有保存任何链接，在上方输入 URL 添加</p>
    </div>

    <!-- Subscriptions List -->
    <div class="space-y-3">
      <div
        v-for="sub in subscriptions"
        :key="sub.url"
        class="bg-white dark:bg-[#1A1A1A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <LinkIcon :size="16" class="text-blue-500 flex-shrink-0" />
            <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ sub.title || sub.url }}</span>
            <span v-if="sub.hasContent" class="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded">已抓取</span>
          </div>
          <p v-if="sub.summary || sub.content" class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-1">{{ sub.summary || sub.content }}</p>
          <a :href="sub.url" target="_blank" class="text-xs text-blue-500 dark:text-blue-400 hover:underline truncate block">{{ sub.url }}</a>
          <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">添加于 {{ formatDate(sub.addedAt) }}</div>
        </div>
        <div class="flex flex-col gap-2 ml-4">
          <button
            v-if="!sub.inLibrary"
            @click="$emit('add-to-library', sub)"
            class="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >加入内容</button>
          <span v-if="sub.inLibrary" class="px-3 py-1.5 text-xs bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 rounded-lg">已加入</span>
          <button
            v-if="sub.hasContent"
            @click="$emit('view-content', sub)"
            class="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222]"
          >查看</button>
          <button
            @click="$emit('remove', sub.url)"
            class="px-3 py-1.5 text-xs border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
          >删除</button>
        </div>
      </div>
    </div>

    <!-- View Content Modal -->
    <div v-if="viewingLink" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close-view')">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div class="relative bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white pr-8">{{ viewingLink.title }}</h3>
          <a :href="viewingLink.url" target="_blank" class="text-xs text-blue-500 hover:underline truncate block mt-1">{{ viewingLink.url }}</a>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{{ viewingLink.content || '暂无内容' }}</p>
        </div>
        <div class="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button @click="$emit('close-view')" class="px-4 py-2 bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">关闭</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { Link as LinkIcon, Loader2 } from 'lucide-vue-next';

defineProps({
  subscriptions: { type: Array, default: () => [] },
  customUrl: { type: String, default: '' },
  isCheckingUrl: { type: Boolean, default: false },
  urlCheckResult: { type: Object, default: null },
  viewingLink: { type: Object, default: null },
});

defineEmits([
  'update:custom-url', 'add-url', 'save-link-all', 'save-link-only',
  'view-content', 'close-view', 'add-to-library', 'remove'
]);

const formatDate = (iso) => (!iso ? '—' : String(iso).slice(0, 10));
</script>
