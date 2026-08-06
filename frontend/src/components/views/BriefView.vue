<template>
  <main class="max-w-5xl mx-auto px-8 md:px-12 py-12">
    <div class="mb-14">
      <div class="text-[11px] font-semibold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase mb-3">Daily Intelligence Brief</div>
      <h1 class="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4 tracking-tight">{{ displayDate }}</h1>
      <p class="text-gray-500 dark:text-gray-400 text-sm">今日共更新 <span class="font-semibold text-gray-700 dark:text-gray-300">{{ todayCount }}</span> 篇情报</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-white dark:bg-[#1A1A1A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-28 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer"
        @click="$emit('navigate', 'content'); $emit('filter', stat.label)"
      >
        <div class="flex items-center text-gray-500 dark:text-gray-400 text-[13px] font-medium">
          <Activity :size="16" class="mr-2" />{{ stat.label }}
        </div>
        <div class="text-3xl font-serif text-gray-900 dark:text-white">{{ stat.count }}</div>
      </div>
    </div>

    <!-- 今日简报 -->
    <div class="mb-16">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400">
          <BookOpen :size="16" class="mr-2" />今日简报
        </div>
        <button
          v-if="hasAudio"
          @click="$emit('toggle-audio')"
          class="flex items-center px-4 py-2 bg-[#2D3A5F] dark:bg-[#3D4F7C] hover:bg-[#1f2844] dark:hover:bg-[#2D3A5F] text-white text-xs font-medium rounded-full transition-all shadow-sm active:scale-95"
        >
          <Volume2 v-if="isPlaying" :size="14" class="mr-2" />
          <Play v-else :size="14" class="mr-2 fill-current" />
          {{ isPlaying ? '暂停收听' : '收听音频' }}
        </button>
        <button v-else disabled class="flex items-center px-4 py-2 bg-gray-100 dark:bg-[#222] text-gray-400 dark:text-gray-600 text-xs font-medium rounded-full cursor-not-allowed">
          <Volume2 :size="14" class="mr-2" /> 播客生成中...
        </button>
      </div>

      <div class="bg-white dark:bg-[#1A1A1A] p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">今日要点</h2>

        <div v-if="briefing" class="prose prose-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-none whitespace-pre-wrap" v-html="formatBriefing(briefing)"></div>

        <div v-else class="space-y-8">
          <div v-for="(section, sIdx) in briefingData" :key="sIdx">
            <h3 class="text-[15px] font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <span class="mr-2">{{ getCategoryEmoji(section.category) }}</span> {{ section.category }}
            </h3>
            <div class="space-y-4">
              <div v-for="(item, iIdx) in section.items" :key="iIdx" class="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">
                <a :href="item.url" target="_blank" class="text-gray-900 dark:text-white font-bold hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer">{{ item.title }}</a> — {{ item.desc }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="!briefing && briefingData.length === 0" class="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
          <p>今天暂无高优情报更新</p>
        </div>
      </div>
    </div>

    <!-- Aivalley Trending Tools -->
    <div v-if="aivalleyPicks.tools.length > 0" class="mb-20">
      <div class="flex items-center text-xs font-semibold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-5">
        <Lightbulb :size="14" class="mr-2" />AIVALLEY TRENDING TOOLS · 热门工具
      </div>
      <div class="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
          <a v-for="(item, idx) in aivalleyPicks.tools" :key="idx" :href="extractLinkFromSummary(item.summary) || getAivalleyLink(item)" target="_blank" class="p-3 rounded-xl bg-gray-50 dark:bg-[#111] hover:bg-gray-100 dark:hover:bg-[#222] transition-colors group">
            <div class="flex items-center mb-1">
              <h3 class="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate text-sm">{{ item.title }}</h3>
              <ExternalLink :size="12" class="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
            <p class="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{{ item.summary }}</p>
          </a>
        </div>
      </div>
    </div>

    <!-- GitHub Trending -->
    <div v-if="githubTrending.length > 0" class="mb-20">
      <div class="flex items-center text-xs font-semibold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-5">
        <TrendingUp :size="14" class="mr-2" />GITHUB TRENDING · 今日热门开源项目
      </div>
      <div class="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <a
          v-for="(repo, idx) in githubTrending"
          :key="idx"
          :href="repo.url"
          target="_blank"
          class="p-5 flex items-start hover:bg-gray-50 dark:hover:bg-[#222] transition-colors group block border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
        >
          <div class="text-gray-400 dark:text-gray-500 font-mono w-8 mt-0.5 text-sm">{{ idx + 1 }}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center mb-1">
              <h3 class="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{{ repo.title }}</h3>
              <ExternalLink :size="14" class="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p class="text-[13px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed line-clamp-2">
              {{ repo.summary || repo.preFetchedContent || 'No description available.' }}
            </p>
            <div class="flex items-center text-xs text-gray-400 dark:text-gray-500 space-x-4">
              <span class="flex items-center"><Star :size="12" class="mr-1" /> GitHub</span>
              <span class="px-2 py-0.5 bg-gray-100 dark:bg-[#252525] rounded text-gray-500 dark:text-gray-400 font-medium">Trending</span>
            </div>
          </div>
        </a>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue';
import { Activity, BookOpen, TrendingUp, ExternalLink, Star, Play, Volume2, Lightbulb } from 'lucide-vue-next';

const props = defineProps({
  briefing: { type: String, default: '' },
  briefingData: { type: Array, default: () => [] },
  stats: { type: Array, default: () => [] },
  todayCount: { type: Number, default: 0 },
  displayDate: { type: String, default: '' },
  githubTrending: { type: Array, default: () => [] },
  aivalleyArticles: { type: Array, default: () => [] },
  hasAudio: { type: Boolean, default: false },
  isPlaying: { type: Boolean, default: false },
});

defineEmits(['toggle-audio', 'navigate', 'filter']);

// Aivalley 热门工具
const aivalleyPicks = computed(() => {
  const articles = props.aivalleyArticles || [];
  const isTool = (a) => a.category === 'AI工具' || a.title?.startsWith('🔧') || a.title?.includes('🔧');
  return {
    tools: articles.filter(a => isTool(a)),
  };
});

// 从 Aivalley 子文章 URL 中提取真实外部链接（处理 #aivalley-N 锚点）
const getAivalleyLink = (article) => {
  if (!article.url) return '#';
  if (article.url.includes('#aivalley-')) {
    // 子文章：Newsletter 主页面链接（去掉锚点）
    return article.url.split('#')[0];
  }
  return article.url;
};

// 从 summary 中提取 "text: URL" 格式的链接（Aivalley 工具/推荐中有）
const extractLinkFromSummary = (summary) => {
  if (!summary) return null;
  const match = summary.match(/https?:\/\/[^\s，。,]+/);
  return match ? match[0] : null;
};

const getCategoryEmoji = (category) => {
  if (category.includes('人工智能') || category.includes('AI')) return '🤖';
  if (category.includes('宏观经济') || category.includes('金融')) return '📈';
  if (category.includes('互联网')) return '🌐';
  if (category.includes('科技') || category.includes('前沿')) return '🚀';
  if (category.includes('创投') || category.includes('政策')) return '💼';
  return '📰';
};

const formatBriefing = (text) => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">$1</h1>');
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300 list-disc list-inside">$1</li>');

  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return trimmed;
    const content = trimmed.replace(/\n/g, '<br>');
    return `<p class="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">${content}</p>`;
  }).join('\n');

  return html;
};
</script>
