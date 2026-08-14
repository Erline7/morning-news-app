<template>
  <main class="max-w-5xl mx-auto px-8 md:px-12 py-12">
    <!-- Article Detail -->
    <div v-if="selectedArticle" class="max-w-3xl mx-auto">
      <button @click="$emit('select-article', null)" class="mb-8 flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">← 返回内容列表</button>
      <div class="bg-white dark:bg-[#1A1A1A] p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-3 mb-6">
          <span class="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">{{ selectedArticle.category }}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ selectedArticle.source }}</span>
        </div>
        <h1 class="text-3xl font-bold leading-tight text-gray-900 dark:text-white mb-6">{{ selectedArticle.title }}</h1>
        <div class="prose prose-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-none">
          <p>{{ selectedArticle.summary }}</p>
        </div>
        <div class="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
          <a v-if="getArticleUrl(selectedArticle)" :href="getArticleUrl(selectedArticle)" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline flex items-center font-medium">阅读原文 <ExternalLink :size="16" class="ml-1" /></a>
          <span v-else class="text-gray-400 dark:text-gray-500 text-sm flex items-center"><Mail :size="14" class="mr-1.5" /> 邮件/内部内容</span>
          <span class="text-gray-400 dark:text-gray-500 flex items-center"><Clock :size="14" class="mr-1" />{{ formatDate(selectedArticle.collectedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Article List -->
    <div v-else>
      <div class="flex items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">知识情报库</h2>
        <span class="ml-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#222] px-3 py-1 rounded-full">{{ articles.length }} 篇</span>
      </div>

      <!-- Search -->
      <div class="mb-4 relative">
        <input
          :value="searchQuery"
          @input="$emit('update:search-query', $event.target.value)"
          type="text"
          placeholder="搜索文章标题、分类、来源..."
          class="w-full px-4 py-2.5 pl-10 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 dark:text-gray-200"
        />
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <button v-if="searchQuery" @click="$emit('update:search-query', '')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X :size="14" /></button>
      </div>

      <!-- Add URL -->
      <div class="mb-6">
        <div class="flex items-center gap-2">
          <input
            :value="customUrl"
            @input="$emit('update:custom-url', $event.target.value)"
            @keydown.enter="$emit('add-url')"
            :disabled="isCheckingUrl"
            placeholder="输入文章链接，抓取并保存..."
            class="flex-1 px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 disabled:opacity-60"
          />
          <button @click="$emit('add-url')" :disabled="!customUrl.trim() || isCheckingUrl" class="px-4 py-2.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] disabled:opacity-50 transition-all flex items-center min-w-[90px] justify-center">
            <Loader2 v-if="isCheckingUrl" :size="16" class="animate-spin" />
            <span v-else class="flex items-center"><Plus :size="16" class="mr-1" />抓取</span>
          </button>
        </div>

        <!-- URL Preview -->
        <div v-if="urlCheckResult" class="mt-3 p-4 rounded-xl border" :class="urlCheckResult.success ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20' : 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20'">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">{{ urlCheckResult.title || urlCheckResult.url }}</div>
              <a :href="urlCheckResult.url" target="_blank" class="text-xs text-blue-500 hover:underline truncate block">{{ urlCheckResult.url }}</a>
              <p v-if="urlCheckResult.summary" class="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">{{ urlCheckResult.summary }}</p>
              <p v-if="urlCheckResult.category && urlCheckResult.success" class="text-xs text-blue-500 mt-1">分类：{{ urlCheckResult.category }}</p>
              <p v-if="urlCheckResult.justSaved" class="text-xs text-emerald-500 mt-2">✓ 已保存到内容库</p>
              <p v-if="!urlCheckResult.success" class="text-xs text-red-500 mt-2">{{ urlCheckResult.error || '抓取失败' }}</p>
            </div>
            <div class="flex gap-2 ml-4 flex-shrink-0">
              <button v-if="urlCheckResult.success && !urlCheckResult.justSaved" @click="$emit('save-link-all')" class="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">保存到内容库</button>
              <button v-if="!urlCheckResult.success && !urlCheckResult.justSaved" @click="$emit('save-link-only')" class="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600">仅保存链接</button>
              <button v-if="!urlCheckResult.justSaved" @click="urlCheckResult = null" class="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg">取消</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex space-x-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          v-for="f in ['全部', ...stats.map(s => s.label)]"
          :key="f"
          @click="$emit('filter', f)"
          class="px-5 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all border"
          :class="activeFilter === f ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white border-[#2D3A5F] dark:border-[#3D4F7C] shadow-sm' : 'bg-white dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#252525]'"
        >{{ f }}</button>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="article in articles"
          :key="article.url"
          @click="$emit('select-article', article)"
          class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer flex flex-col h-56 group"
        >
          <div class="flex justify-between items-start mb-4">
            <div class="relative">
              <span
                class="px-2.5 py-1 bg-[#F4F6F8] dark:bg-[#252525] text-[#2D3A5F] dark:text-blue-300 text-xs font-semibold rounded-md cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all inline-flex items-center whitespace-nowrap"
                :title="(userEdits[article.url]) ? '已手动修改分类' : '点击编辑分类'"
                @click.stop="$emit('open-category-editor', article)"
              >
                {{ userEdits[article.url] || article.category }}
                <Pencil :size="10" class="inline ml-1 opacity-50" />
              </span>
              <span v-if="userEdits[article.url]" class="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" title="用户已修改"></span>
            </div>
            <span v-if="article.isUserAdded" class="text-[10px] font-medium px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded">用户</span>
          </div>
          <h3 class="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" :title="article.title">{{ article.title }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{{ article.summary }}</p>
          <div class="flex-1"></div>
          <div class="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800/60 pt-4 mt-2">
            <span class="font-medium truncate max-w-[70%]">{{ article.source }}</span>
            <div class="flex items-center gap-2">
              <button @click.stop="$emit('toggle-star', article)" :title="article.isStarred ? '取消收藏' : '收藏'" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#333] transition-colors">
                <Star :size="14" :class="article.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'" />
              </button>
              <button @click.stop="$emit('delete-article', article)" title="删除" class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-gray-400 hover:text-red-500"><Trash2 :size="14" /></button>
              <span class="flex items-center whitespace-nowrap"><Clock :size="12" class="mr-1" />{{ formatDate(article.collectedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Editor Modal -->
    <div v-if="showCategoryEditor" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="$emit('close-category-editor')">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div class="relative bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md mx-4 p-6">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">修改分类</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{{ editingArticle?.title }}</p>
        <div class="mb-4">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">选择分类</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="cat in availableCategories" :key="cat" @click="$emit('update:new-category', cat)" class="px-3 py-1.5 text-sm rounded-lg border transition-all" :class="newCategory === cat ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white border-[#2D3A5F] dark:border-[#3D4F7C]' : 'bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'">{{ cat }}</button>
          </div>
        </div>
        <div class="mb-6">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">或创建新分类</label>
          <input :value="newCategory" @input="$emit('update:new-category', $event.target.value)" placeholder="输入新分类名称..." class="w-full px-4 py-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800" />
        </div>
        <div class="flex justify-end gap-3">
          <button @click="$emit('close-category-editor')" class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg">取消</button>
          <button @click="$emit('save-category-edit')" :disabled="!newCategory.trim() || newCategory === editingArticle?.category" class="px-5 py-2 text-sm bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white rounded-lg hover:bg-[#1f2844] disabled:opacity-50 disabled:cursor-not-allowed">保存</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { Search, X, Loader2, Plus, ExternalLink, Clock, Star, Trash2, Pencil } from 'lucide-vue-next';

defineProps({
  articles: { type: Array, default: () => [] },
  selectedArticle: { type: Object, default: null },
  searchQuery: { type: String, default: '' },
  activeFilter: { type: String, default: '全部' },
  stats: { type: Array, default: () => [] },
  customUrl: { type: String, default: '' },
  isCheckingUrl: { type: Boolean, default: false },
  urlCheckResult: { type: Object, default: null },
  userEdits: { type: Object, default: () => ({}) },
  availableCategories: { type: Array, default: () => [] },
  showCategoryEditor: { type: Boolean, default: false },
  editingArticle: { type: Object, default: null },
  newCategory: { type: String, default: '' },
});

defineEmits([
  'select-article', 'filter', 'update:search-query', 'update:custom-url',
  'add-url', 'save-link-all', 'save-link-only', 'toggle-star', 'delete-article',
  'open-category-editor', 'close-category-editor', 'save-category-edit', 'update:new-category'
]);

// 获取文章原始链接，返回 null 表示没有可点击的链接
const getArticleUrl = (article) => {
  if (!article?.url) return null;
  if (article.url.startsWith('email://')) return null;
  if (article.url.includes('#aivalley-')) {
    return article.url.split('#')[0];
  }
  if (article.url.startsWith('http')) {
    return article.url;
  }
  return null;
};

const formatDate = (iso) => (!iso ? '—' : String(iso).slice(0, 10));
</script>
