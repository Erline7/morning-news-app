<template>
  <main class="max-w-5xl mx-auto px-8 md:px-12 py-12 h-full overflow-y-auto">
    <!-- Note Detail -->
    <div v-if="selectedNote" class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <button @click="$emit('back')" class="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">← 返回笔记列表</button>
        <div class="flex gap-2">
          <button @click="$emit('insert-link')" class="flex items-center px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222]"><Link :size="14" class="mr-1.5" />插入原文摘要</button>
          <button @click="$emit('delete-note')" class="flex items-center px-3 py-1.5 text-xs border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 :size="14" class="mr-1.5" />删除</button>
        </div>
      </div>

      <div class="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="p-8 pb-4">
          <input
            v-model="selectedNote.title"
            @input="markDirty"
            placeholder="笔记标题..."
            class="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-4"
          />
        </div>
        <div class="px-8 pb-4">
          <textarea
            v-model="selectedNote.content"
            @input="markDirty"
            placeholder="写下你的感悟..."
            class="w-full h-72 text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-gray-100 dark:border-gray-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 resize-none"
          ></textarea>
        </div>
        <div v-if="selectedNote.linkedArticles?.length > 0" class="px-8 pb-6">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center"><Link :size="12" class="mr-1.5" />关联的原文 ({{ selectedNote.linkedArticles.length }} 篇)</div>
          <div class="space-y-2">
            <a v-for="(link, idx) in selectedNote.linkedArticles" :key="idx" :href="link.url" target="_blank" class="flex items-start p-3 bg-gray-50 dark:bg-[#121212] rounded-lg hover:bg-gray-100 dark:hover:bg-[#222] transition-colors group border border-gray-100 dark:border-gray-800">
              <ExternalLink :size="14" class="mt-0.5 mr-2 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{{ link.title }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{{ link.summary }}</div>
              </div>
            </a>
          </div>
        </div>
        <div class="px-8 py-4 bg-gray-50 dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500 flex justify-between">
          <span>创建于 {{ formatDate(selectedNote.createdAt) }}</span>
          <span>最后修改 {{ formatDate(selectedNote.updatedAt) }}</span>
        </div>
      </div>
      <div class="mt-4 text-center">
        <button @click="$emit('save-note')" class="px-8 py-2.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] transition-colors shadow-sm disabled:opacity-50" :disabled="!isDirty">{{ isDirty ? '保存笔记' : '已保存' }}</button>
      </div>
    </div>

    <!-- Note List -->
    <div v-else>
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">我的笔记</h2>
        <button @click="$emit('create-note')" class="flex items-center px-4 py-2 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] shadow-sm"><Plus :size="16" class="mr-2" />新建笔记</button>
      </div>

      <div v-if="notes.length === 0" class="text-center py-20">
        <StickyNote :size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p class="text-gray-500 dark:text-gray-400 text-sm">还没有笔记，点击「新建笔记」开始记录你的感悟</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="note in notes"
          :key="note.id"
          @click="$emit('select-note', note)"
          class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer flex flex-col h-52 group"
        >
          <h3 class="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ note.title || '无标题' }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-2 flex-1">{{ note.content || '无内容' }}</p>
          <div class="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800/60 pt-3 mt-auto">
            <span class="flex items-center" :title="'创建于 ' + formatDate(note.createdAt)"><Calendar :size="12" class="mr-1" />{{ formatDate(note.createdAt) }}</span>
            <span v-if="note.linkedArticles?.length > 0" class="flex items-center text-blue-500"><Link :size="12" class="mr-1" />{{ note.linkedArticles.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Article Picker Modal -->
    <div v-if="showPicker" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="$emit('close-picker')">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div class="relative bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div class="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">选择要关联的文章</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">点击文章插入为摘要超链接</p>
          <div class="mt-3 relative">
            <input
              :value="searchQuery"
              @input="$emit('update:search-query', $event.target.value)"
              type="text"
              placeholder="搜索文章标题、分类、来源..."
              class="w-full px-4 py-2 pl-10 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 dark:text-gray-200"
            />
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <button v-if="searchQuery" @click="$emit('update:search-query', '')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X :size="14" /></button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
          <button v-for="article in filteredArticles" :key="article.url" @click="$emit('pick-article', article)" class="w-full text-left p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#222] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            <div class="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{{ article.title }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{{ article.summary }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-3">
              <span>{{ article.category }}</span><span>{{ article.source }}</span><span>{{ formatDate(article.collectedAt) }}</span>
            </div>
          </button>
          <div v-if="filteredArticles.length === 0" class="text-center py-10 text-gray-400 text-sm">没有找到匹配的文章</div>
        </div>
        <div class="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <span class="text-xs text-gray-400">共 {{ filteredArticles.length }} 篇</span>
          <button @click="$emit('close-picker')" class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg">取消</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { Plus, StickyNote, Link, ExternalLink, Calendar, Search, X, Trash2 } from 'lucide-vue-next';

defineProps({
  notes: { type: Array, default: () => [] },
  selectedNote: { type: Object, default: null },
  isDirty: { type: Boolean, default: false },
  showPicker: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  filteredArticles: { type: Array, default: () => [] },
});

defineEmits([
  'create-note', 'select-note', 'back', 'save-note', 'delete-note',
  'insert-link', 'pick-article', 'close-picker', 'update:search-query'
]);

const formatDate = (iso) => (!iso ? '—' : String(iso).slice(0, 10));
</script>
