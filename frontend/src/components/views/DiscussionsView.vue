<template>
  <main class="max-w-4xl mx-auto px-8 md:px-12 py-12">
    <div class="mb-10">
      <div class="text-[11px] font-semibold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase mb-3">Hacker News</div>
      <h1 class="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4 tracking-tight">人们正在讨论</h1>
      <p class="text-gray-500 dark:text-gray-400 text-sm">HN 今日热门 Top 10 · 标题已翻译成中文</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-3 text-gray-500">正在加载讨论...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-10 text-gray-400">
      <p>{{ error }}</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <a
        v-for="(item, idx) in discussions"
        :key="idx"
        :href="item.url"
        target="_blank"
        class="block bg-white dark:bg-[#1A1A1A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
      >
        <div class="flex items-start">
          <div class="text-gray-300 dark:text-gray-600 font-mono text-2xl font-bold w-10 mt-[-2px] flex-shrink-0">
            {{ idx + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug mb-1">
              {{ item.titleZh || item.title }}
            </h3>
            <p v-if="item.titleZh && item.titleZh !== item.title" class="text-[13px] text-gray-400 dark:text-gray-500 truncate">
              {{ item.title }}
            </p>
            <div class="flex items-center mt-3 text-xs text-gray-400 dark:text-gray-500 space-x-4">
              <span class="flex items-center">
                <ArrowUp :size="12" class="mr-1" /> {{ item.points }} 点
              </span>
              <a
                :href="item.hnUrl"
                target="_blank"
                @click.stop
                class="flex items-center hover:text-blue-500 transition-colors"
              >
                <MessageCircle :size="12" class="mr-1" /> {{ item.comments }} 评论
              </a>
              <span class="text-gray-300 dark:text-gray-600">{{ item.source }}</span>
            </div>
          </div>
          <ExternalLink :size="16" class="ml-3 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
        </div>
      </a>
    </div>

    <!-- Empty -->
    <div v-if="!isLoading && !error && discussions.length === 0" class="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
      <p>今日暂无讨论数据</p>
    </div>

    <!-- Updated time -->
    <div v-if="fetchedAt" class="mt-8 text-center text-[12px] text-gray-400 dark:text-gray-600">
      更新时间: {{ formatTime(fetchedAt) }}
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ArrowUp, MessageCircle, ExternalLink } from 'lucide-vue-next';

const R2_BASE_URL = 'https://cdn.secondmind.eu.cc';

const discussions = ref([]);
const isLoading = ref(true);
const error = ref('');
const fetchedAt = ref('');

// 北京时间日期
const getBeijingDateStr = () => {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

onMounted(async () => {
  isLoading.value = true;
  try {
    const dateKey = getBeijingDateStr();
    const url = `${R2_BASE_URL}/data/hn_discussions/${dateKey}.json?t=${Date.now()}`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      discussions.value = data.discussions || [];
      fetchedAt.value = data.fetchedAt || '';
    } else {
      error.value = '今日讨论数据尚未生成';
    }
  } catch (e) {
    error.value = '加载失败，请稍后重试';
  } finally {
    isLoading.value = false;
  }
});
</script>
