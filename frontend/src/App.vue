<template>
  <div :class="{ 'dark': isDarkMode }" class="h-screen w-full flex font-sans overflow-hidden bg-white text-gray-800 dark:bg-[#121212] dark:text-gray-200 selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">

    <!-- Sidebar -->
    <Sidebar
      :active-tab="activeTab"
      :active-filter="activeFilter"
      :total-articles="totalArticles"
      :notes-count="notes.length"
      :subscriptions-count="userSubUrls.length"
      :stats="stats"
      @navigate="handleNavigate"
      @filter="activeFilter = $event"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 bg-[#FBFBFB] dark:bg-[#161616] transition-colors">
      <Header
        :active-tab="activeTab"
        :active-filter="activeFilter"
        :display-date="displayDateStr"
        :is-dark-mode="isDarkMode"
        @toggle-dark="toggleDarkMode"
      />

      <div class="flex-1 overflow-y-auto relative" ref="scrollContainer">
        <!-- Loading -->
        <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-[#FBFBFB] dark:bg-[#161616] z-50">
          <Loader2 :size="40" class="animate-spin text-blue-500 mb-4" />
          <p class="text-gray-500 dark:text-gray-400">正在同步今日知识库情报...</p>
        </div>

        <!-- Views -->
        <BriefView v-else-if="activeTab === 'brief'"
          :briefing="dailyBriefing"
          :briefing-data="briefingData"
          :stats="stats"
          :today-count="todayArticlesCount"
          :display-date="displayDateStr"
          :github-trending="githubTrending"
          :aivalley-articles="aivalleyArticlesToday"
          :has-audio="hasAudio"
          :is-playing="isPlaying"
          @toggle-audio="toggleAudio"
          @navigate="handleNavigate"
          @filter="activeFilter = $event"
        />

        <ContentLibrary v-else-if="activeTab === 'content'"
          :articles="filteredArticles"
          :selected-article="selectedArticle"
          :search-query="contentSearchQuery"
          :active-filter="activeFilter"
          :stats="stats"
          :custom-url="customUrl"
          :is-checking-url="isCheckingUrl"
          :url-check-result="urlCheckResult"
          :user-edits="userEdits"
          :available-categories="availableCategories"
          :show-category-editor="showCategoryEditor"
          :editing-article="editingArticle"
          :new-category="newCategory"
          @update:search-query="contentSearchQuery = $event"
          @update:custom-url="customUrl = $event"
          @filter="activeFilter = $event"
          @open-category-editor="openCategoryEditor"
          @close-category-editor="showCategoryEditor = false"
          @save-category-edit="saveCategoryEdit"
          @update:new-category="newCategory = $event"
          @add-url="handleAddUrl"
          @save-link-all="saveLinkAll"
          @save-link-only="saveLinkOnly"
          @toggle-star="toggleStar"
          @delete-article="deleteArticle"
          @select-article="selectArticle($event)"
        />

        <ChatView v-else-if="activeTab === 'chat'"
          :messages="chatMessages"
          :is-loading="isChatLoading"
          :input="chatInput"
          :selected-model="selectedModel"
          :preset-models="PRESET_MODELS"
          :show-selector="showModelSelector"
          :custom-base-u-r-l="customBaseURL"
          :custom-model-name="customModelName"
          :custom-api-key="customApiKey"
          @update:input="chatInput = $event"
          @send="sendMessage"
          @toggle-selector="showModelSelector = !showModelSelector"
          @select-model="chatModelId = $event; saveModelConfig()"
          @update:custom-base-u-r-l="customBaseURL = $event; saveModelConfig()"
          @update:custom-model-name="customModelName = $event; saveModelConfig()"
          @update:custom-api-key="customApiKey = $event; saveModelConfig()"
        />

        <NotesView v-else-if="activeTab === 'notes'"
          :notes="sortedNotes"
          :selected-note="selectedNote"
          :is-dirty="isNoteDirty"
          :show-picker="showArticlePicker"
          :search-query="articleSearchQuery"
          :filtered-articles="filteredPickerArticles"
          @create-note="createNote"
          @select-note="selectedNote = $event"
          @back="selectedNote = null"
          @save-note="saveNote"
          @delete-note="deleteNote"
          @insert-link="insertArticleLink"
          @pick-article="pickArticle"
          @close-picker="showArticlePicker = false"
          @update:search-query="articleSearchQuery = $event"
        />

        <SubscriptionsView v-else-if="activeTab === 'subscriptions'"
          :subscriptions="userSubUrls"
          :custom-url="customUrl"
          :is-checking-url="isCheckingUrl"
          :url-check-result="urlCheckResult"
          :viewing-link="viewingLink"
          @update:custom-url="customUrl = $event"
          @add-url="handleAddUrl"
          @save-link-all="saveLinkAll"
          @save-link-only="saveLinkOnly"
          @view-content="viewLinkContent"
          @close-view="viewingLink = null"
          @add-to-library="addToLibrary"
          @remove="removeSubscription"
        />

        <ReportView v-else-if="activeTab === 'report'"
          :report="dailyReport"
          :is-loading="isGeneratingReport"
          @refresh="loadReport"
        />

        <TimelineView v-else-if="activeTab === 'timeline'"
          :events="timelineEvents"
          :analysis="timelineAnalysis"
          :active-threads="activeThreads"
          @refresh="loadTimeline"
        />

        <DiscussionsView v-else-if="activeTab === 'discussions'" />

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { Loader2 } from 'lucide-vue-next';

// Components
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import BriefView from './components/views/BriefView.vue';
import ContentLibrary from './components/views/ContentLibrary.vue';
import ChatView from './components/views/ChatView.vue';
import NotesView from './components/views/NotesView.vue';
import SubscriptionsView from './components/views/SubscriptionsView.vue';
import ReportView from './components/views/ReportView.vue';
import TimelineView from './components/views/TimelineView.vue';
import DiscussionsView from './components/views/DiscussionsView.vue';

// --- State ---
const activeTab = ref('brief');
const activeFilter = ref('全部');
const isLoading = ref(true);
const scrollContainer = ref(null);

const isDarkMode = ref(false);
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('dark', isDarkMode.value);
  localStorage.setItem('darkMode', isDarkMode.value ? 'true' : 'false');
};

// --- Configuration ---
const R2_BASE_URL = 'https://cdn.secondmind.eu.cc';
const WORKER_CHAT_API = 'https://dailybrief-chat-api.erline68.workers.dev';
const API_BASE = 'https://dailybrief-api.erline68.workers.dev';

const PRESET_MODELS = [
  { id: 'default', name: '默认 (Worker API)', provider: 'worker', endpoint: WORKER_CHAT_API },
  { id: 'longcat', name: 'LongCat-2.0', provider: 'worker-custom', endpoint: WORKER_CHAT_API, model: 'LongCat-2.0', baseURL: 'https://api.longcat.chat/openai/v1' },
  { id: 'deepseek', name: 'DeepSeek', provider: 'custom', model: 'deepseek-chat', baseURL: 'https://api.deepseek.com/v1' },
  { id: 'glm', name: '智谱 GLM', provider: 'custom', model: 'glm-4-flash', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'kimi', name: 'Kimi', provider: 'custom', model: 'moonshot-v1-8k', baseURL: 'https://api.moonshot.cn/v1' },
  { id: 'qwen', name: '通义千问', provider: 'custom', model: 'qwen-plus', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'custom', name: '自定义 API', provider: 'custom' },
];

// --- Data State ---
const rawArticles = ref([]);
const displayDateStr = ref('');
const githubTrendingData = ref([]);
const dailyBriefing = ref('');
const dailyScript = ref('');
const dailyReport = ref(null);
const isGeneratingReport = ref(false);
const notes = ref([]);
const selectedNote = ref(null);
const selectedArticle = ref(null);
const showArticlePicker = ref(false);
const articleSearchQuery = ref('');
const contentSearchQuery = ref('');
const isNoteDirty = ref(false);
const showCategoryEditor = ref(false);
const editingArticle = ref(null);
const newCategory = ref('');
const userEdits = ref({});
const availableCategories = ref([]);
const customUrl = ref('');
const isCheckingUrl = ref(false);
const urlCheckResult = ref(null);
const userSubUrls = ref([]);
const viewingLink = ref(null);
const timelineEvents = ref([]);
const timelineAnalysis = ref(null);
const activeThreads = ref([]);

// --- Audio ---
const isPlaying = ref(false);
const hasAudio = ref(false);
let audioPlayer = null;

const toggleAudio = () => {
  if (!audioPlayer) return;
  if (isPlaying.value) audioPlayer.pause();
  else audioPlayer.play().catch(e => console.error('播放失败:', e));
  isPlaying.value = !isPlaying.value;
};

// --- Chat State ---
const chatInput = ref('');
const isChatLoading = ref(false);
const chatMessages = ref([
  { role: 'assistant', content: '你好！我是你的 AI 助手。我已经读取了历史知识库情报。可以为你深入分析任何话题，或者回答你感兴趣的问题。' }
]);
const chatModelId = ref(localStorage.getItem('chat_model_id') || 'default');
const customApiKey = ref(localStorage.getItem('chat_custom_key') || '');
const customBaseURL = ref(localStorage.getItem('chat_custom_base') || 'https://api.openai.com/v1');
const customModelName = ref(localStorage.getItem('chat_custom_model') || 'gpt-4o-mini');
const showModelSelector = ref(false);
const chatMessagesRef = ref(null);

const selectedModel = computed(() => PRESET_MODELS.find(m => m.id === chatModelId.value) || PRESET_MODELS[0]);

const saveModelConfig = () => {
  localStorage.setItem('chat_model_id', chatModelId.value);
  localStorage.setItem('chat_custom_key', customApiKey.value);
  localStorage.setItem('chat_custom_base', customBaseURL.value);
  localStorage.setItem('chat_custom_model', customModelName.value);
};

// --- Navigation ---
const handleNavigate = (tab) => {
  activeTab.value = tab;
  if (tab === 'report') loadReport();
  if (tab === 'timeline') loadTimeline();
};

// --- Computed ---
// 使用北京时间日期，确保和后端 KV 键名一致
const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];

const totalArticles = computed(() => rawArticles.value.filter(a => !a.isGithubTrending).length);

const todayArticlesCount = computed(() =>
  rawArticles.value.filter(a => {
    if (!a.collectedAt || a.isGithubTrending) return false;
    // collectedAt 是 UTC，转成北京时间日期再比较
    const bjDate = new Date(a.collectedAt).getTime() + 8 * 60 * 60 * 1000;
    const bjDateStr = new Date(bjDate).toISOString().split('T')[0];
    return bjDateStr === todayStr;
  }).length
);

const stats = computed(() => {
  const counts = {};
  rawArticles.value.filter(a => !a.isGithubTrending).forEach(article => {
    const cat = userEdits.value[article.url] || article.category;
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts).map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
});

const filteredArticles = computed(() => {
  let mainArticles = rawArticles.value.filter(article => !article.isGithubTrending);
  const query = contentSearchQuery.value.toLowerCase().trim();
  if (query) {
    mainArticles = mainArticles.filter(a =>
      a.title?.toLowerCase().includes(query) ||
      a.category?.toLowerCase().includes(query) ||
      a.source?.toLowerCase().includes(query) ||
      a.summary?.toLowerCase().includes(query)
    );
  }
  if (activeFilter.value === '全部') return mainArticles;
  return mainArticles.filter(article => {
    const cat = userEdits.value[article.url] || article.category;
    return cat === activeFilter.value;
  });
});

const briefingData = computed(() => {
  const grouped = {};
  const todayArticles = rawArticles.value
    .filter(a => {
      if (!a.collectedAt || a.isGithubTrending) return false;
      const bjDate = new Date(a.collectedAt).getTime() + 8 * 60 * 60 * 1000;
      const bjDateStr = new Date(bjDate).toISOString().split('T')[0];
      return bjDateStr === todayStr;
    })
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 10);
  todayArticles.forEach(article => {
    if (article.summary) {
      const cat = userEdits.value[article.url] || article.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ title: article.title, desc: article.summary, url: article.url });
    }
  });
  return Object.entries(grouped).map(([category, items]) => ({ category, items }));
});

const githubTrending = computed(() => githubTrendingData.value.slice(0, 10));

// Aivalley 今日文章（用于首页 Aivalley Picks 区域）
const aivalleyArticlesToday = computed(() =>
  rawArticles.value.filter(a => {
    if (a.source !== 'Aivalley' || !a.collectedAt) return false;
    const bjDate = new Date(a.collectedAt).getTime() + 8 * 60 * 60 * 1000;
    const bjDateStr = new Date(bjDate).toISOString().split('T')[0];
    return bjDateStr === todayStr;
  })
);

const sortedNotes = computed(() => {
  return [...notes.value].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
});

const filteredPickerArticles = computed(() => {
  const query = articleSearchQuery.value.toLowerCase().trim();
  if (!query) return rawArticles.value;
  return rawArticles.value.filter(a =>
    a.title?.toLowerCase().includes(query) ||
    a.category?.toLowerCase().includes(query) ||
    a.source?.toLowerCase().includes(query) ||
    a.summary?.toLowerCase().includes(query)
  );
});

// --- Helpers ---
const formatDate = (date) => {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date);
};

const formatDateDisplay = (iso) => {
  if (!iso) return '—';
  return String(iso).slice(0, 10);
};

const getUserEdit = (url) => userEdits.value[url] || null;

// --- API Calls ---
const loadUserEdits = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/user-edits?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      userEdits.value = data.edits || {};
    }
  } catch (e) {
    console.warn('加载用户修改失败:', e);
  }
};

const loadNotes = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/notes?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      notes.value = data.notes || [];
    }
  } catch (e) {
    console.warn('加载笔记失败:', e);
  }
};

const saveNotes = async () => {
  try {
    await fetch(`${API_BASE}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notes.value }),
    });
  } catch (e) {
    console.warn('保存笔记失败:', e);
  }
};

const loadUserSubUrls = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/user-urls?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      userSubUrls.value = data.urls || [];
    }
  } catch (e) {
    console.warn('加载订阅列表失败:', e);
  }
};

const openCategoryEditor = (article) => {
  editingArticle.value = article;
  newCategory.value = article.category;
  showCategoryEditor.value = true;
};

const saveCategoryEdit = async () => {
  if (!editingArticle.value || !newCategory.value.trim()) return;
  const cat = newCategory.value.trim();
  await fetch(`${API_BASE}/api/user-edits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: editingArticle.value.url, category: cat }),
  });
  userEdits.value[editingArticle.value.url] = cat;
  editingArticle.value.category = cat;
  showCategoryEditor.value = false;
};

// Notes
const createNote = () => {
  const now = new Date().toISOString();
  selectedNote.value = {
    id: 'note-' + Date.now(),
    title: '', content: '', linkedArticles: [],
    createdAt: now, updatedAt: now,
  };
  isNoteDirty.value = false;
};

const markNoteDirty = () => {
  if (selectedNote.value) {
    selectedNote.value.updatedAt = new Date().toISOString();
    isNoteDirty.value = true;
  }
};

const saveNote = async () => {
  if (!selectedNote.value) return;
  selectedNote.value.updatedAt = new Date().toISOString();
  const idx = notes.value.findIndex(n => n.id === selectedNote.value.id);
  if (idx >= 0) notes.value[idx] = { ...selectedNote.value };
  else notes.value.unshift({ ...selectedNote.value });
  await saveNotes();
  isNoteDirty.value = false;

  const linkedUrls = (selectedNote.value.linkedArticles || []).map(a => a.url);
  await recordEvent(idx >= 0 ? 'note_edited' : 'note_created', selectedNote.value.title || '无标题', {
    content: selectedNote.value.content?.slice(0, 100) || '',
    articles: linkedUrls,
    tags: []
  });
};

const deleteNote = async () => {
  if (!selectedNote.value) return;
  notes.value = notes.value.filter(n => n.id !== selectedNote.value.id);
  selectedNote.value = null;
  await saveNotes();
};

const insertArticleLink = () => {
  articleSearchQuery.value = '';
  showArticlePicker.value = true;
};

const pickArticle = (article) => {
  if (!selectedNote.value.linkedArticles) selectedNote.value.linkedArticles = [];
  selectedNote.value.linkedArticles.push({ url: article.url, title: article.title, summary: article.summary });
  markNoteDirty();
  showArticlePicker.value = false;
};

// Articles
const selectArticle = (article) => {
  selectedArticle.value = article;
  recordEvent('article_read', article.title, { articles: [article.url], tags: [article.category].filter(Boolean) });
};

const toggleStar = async (article) => {
  const previousState = article.isStarred;
  article.isStarred = !article.isStarred;
  try {
    const res = await fetch(`${API_BASE}/api/articles/star`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: article.url, isStarred: article.isStarred }),
    });
    if (!res.ok) throw new Error('保存失败');
  } catch {
    article.isStarred = previousState;
  }
  if (article.isStarred) {
    recordEvent('article_starred', article.title, { articles: [article.url], tags: [article.category].filter(Boolean) });
  }
};

const deleteArticle = async (article) => {
  if (!confirm(`确定要删除「${article.title}」吗？`)) return;
  rawArticles.value = rawArticles.value.filter(a => a.url !== article.url);
  try {
    await fetch(`${API_BASE}/api/articles/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: article.url }),
    });
    await loadUserLibrary();
  } catch (e) {
    rawArticles.value.push(article);
  }
};

// Subscriptions
const viewLinkContent = (link) => { viewingLink.value = link; };

const handleAddUrl = async () => {
  if (!customUrl.value.trim()) return;
  isCheckingUrl.value = true;
  urlCheckResult.value = null;
  try {
    const res = await fetch(`${API_BASE}/api/fetch-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: customUrl.value.trim() }),
    });
    const data = await res.json();
    urlCheckResult.value = {
      success: !!data.success,
      url: customUrl.value.trim(),
      title: data.title || customUrl.value.trim(),
      summary: data.summary || '',
      category: data.category || '未分类',
      hasSummary: !!data.summary,
      error: data.error,
    };
  } catch (e) {
    urlCheckResult.value = { success: false, url: customUrl.value.trim(), error: '网络错误' };
  } finally {
    isCheckingUrl.value = false;
  }
};

const saveToMyLinks = async () => {
  if (!urlCheckResult.value) return;
  const item = urlCheckResult.value;
  try {
    await fetch(`${API_BASE}/api/user-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: item.url, title: item.title || item.url, summary: item.summary || '',
        category: item.category || '未分类', hasSummary: !!item.success, action: 'add',
      }),
    });
  } catch (e) {
    console.error('保存链接失败:', e);
  }
};

const saveToLibrary = async () => {
  if (!urlCheckResult.value || !urlCheckResult.value.success) return;
  const item = urlCheckResult.value;
  try {
    const res = await fetch(`${API_BASE}/api/articles/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.title, url: item.url, source: '我的链接',
        summary: item.summary, category: item.category || '未分类',
        importance: 5, isUserAdded: true, collectedAt: new Date().toISOString(),
      }),
    });
    return (await res.json()).success;
  } catch (e) {
    console.error('添加到内容库失败:', e);
    return false;
  }
};

const saveLinkAll = async () => {
  if (!urlCheckResult.value) return;
  const hadSummary = urlCheckResult.value.success;
  if (hadSummary) await saveToLibrary();
  await saveToMyLinks();
  urlCheckResult.value.justSaved = true;
  customUrl.value = '';
  await loadUserSubUrls();
  if (hadSummary) await loadUserLibrary();
  setTimeout(() => { urlCheckResult.value = null; activeTab.value = 'subscriptions'; }, 1500);
};

const saveLinkOnly = async () => {
  if (!urlCheckResult.value) return;
  await saveToMyLinks();
  urlCheckResult.value.justSaved = true;
  customUrl.value = '';
  await loadUserSubUrls();
  setTimeout(() => { urlCheckResult.value = null; activeTab.value = 'subscriptions'; }, 1500);
};

const removeSubscription = async (url) => {
  try {
    await fetch(`${API_BASE}/api/user-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, action: 'remove' }),
    });
    await loadUserSubUrls();
    await loadUserLibrary();
  } catch (e) {
    console.error('删除失败:', e);
  }
};

const addToLibrary = async (sub) => {
  const summaryText = sub.summary || sub.content || '';
  if (!summaryText) return;
  try {
    const res = await fetch(`${API_BASE}/api/articles/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: sub.title || sub.url, url: sub.url, source: '我的链接',
        summary: summaryText, category: sub.category || '未分类',
        importance: 5, isUserAdded: true, collectedAt: sub.addedAt || new Date().toISOString(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      sub.inLibrary = true;
      await loadUserLibrary();
    }
  } catch (e) {
    console.error('添加到内容库失败:', e);
  }
};

// Daily Report
const loadReport = async () => {
  const dateKey = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  isGeneratingReport.value = true;
  try {
    // 直接从 R2 读取
    const res = await fetch(`${R2_BASE_URL}/data/reports/${dateKey}.json?t=${Date.now()}`);
    if (res.ok) {
      dailyReport.value = await res.json();
      return;
    }
    dailyReport.value = {
      date: dateKey,
      summary: '今日复盘报告尚未生成，请稍后再试或等待每日自动更新。',
      thinkingAxis: [], coreThemes: [], questionCount: 0, noteCount: 0,
      insight: '后端每天会自动生成复盘报告。', tomorrowSuggestion: '',
    };
  } catch (e) {
    console.warn('加载报告失败:', e);
  } finally {
    isGeneratingReport.value = false;
  }
};

const loadBriefing = async () => {
  // 用北京时间（UTC+8），和后端 runner.ts 的 getBeijingDate() 保持一致
  const dateKey = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  try {
    // 直接从 R2 读取，不依赖 Worker API
    const res = await fetch(`${R2_BASE_URL}/data/brief/${dateKey}.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      dailyBriefing.value = data.briefing || '';
      dailyScript.value = data.script || '';
    }
  } catch (e) {
    console.warn('加载简报失败:', e);
  }
};

// Timeline
const loadTimeline = async () => {
  const dateKey = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  try {
    const timelineRes = await fetch(`${R2_BASE_URL}/memory/timeline/${dateKey}.json?t=${Date.now()}`);
    if (timelineRes.ok) {
      timelineAnalysis.value = await timelineRes.json();
      timelineEvents.value = timelineAnalysis.value?.events || [];
    } else {
      timelineAnalysis.value = null;
      timelineEvents.value = [];
    }

    const threadsRes = await fetch(`${R2_BASE_URL}/memory/threads.json?t=${Date.now()}`);
    if (threadsRes.ok) {
      const threadsData = await threadsRes.json();
      activeThreads.value = (threadsData.threads || []).filter(
        t => t.status === 'active' || t.status === 'decaying'
      );
    } else {
      activeThreads.value = [];
    }
  } catch (e) {
    console.warn('加载时间线失败:', e);
    timelineAnalysis.value = null;
    timelineEvents.value = [];
    activeThreads.value = [];
  }
};

// Event recording
const recordEvent = async (type, title, options = {}) => {
  const dateKey = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  const event = {
    id: `evt_${dateKey.replace(/-/g, '')}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type, title,
    content: options.content || '',
    refs: { articles: options.articles || [], threads: options.threads || [], notes: options.notes || [] },
    tags: options.tags || []
  };
  try {
    await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateKey, event })
    });
  } catch (e) {
    console.debug('记录事件失败:', e);
  }
};

// Chat
const scrollToBottom = async () => {
  await nextTick();
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!chatInput.value.trim() || isChatLoading.value) return;
  const userText = chatInput.value.trim();
  chatMessages.value.push({ role: 'user', content: userText });
  chatInput.value = '';
  isChatLoading.value = true;
  scrollToBottom();

  const dateKey = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  await fetch(`${API_BASE}/api/chat-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: dateKey, role: 'user', content: userText }),
  }).catch(() => {});

  recordEvent('question_asked', userText.slice(0, 50), { content: userText.slice(0, 100) });

  try {
    const messagesToSend = chatMessages.value
      .filter(msg => !msg.content.startsWith('你好！我是你的 AI 助手。'))
      .map(msg => ({ role: msg.role, content: msg.content }));

    let aiReply = '';

    if (selectedModel.value.provider === 'worker' || selectedModel.value.provider === 'worker-custom') {
      const body = { messages: messagesToSend, date: dateKey };
      if (selectedModel.value.provider === 'worker-custom') {
        body.model = selectedModel.value.model;
        body.baseURL = selectedModel.value.baseURL;
      }
      const response = await fetch(WORKER_CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      aiReply = data.choices?.[0]?.message?.content || '抱歉，API 没有返回有效内容。';
    } else {
      let apiKey = customApiKey.value.trim();
      let baseURL = customBaseURL.value.trim().replace(/\/$/, '');
      let modelName = customModelName.value.trim();

      if (selectedModel.value.id !== 'custom') {
        baseURL = selectedModel.value.baseURL;
        modelName = selectedModel.value.model;
      }

      if (!apiKey) throw new Error('请先在模型设置中填入 API Key');

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: `你是一个智能助手，正在帮助用户分析今天的资讯简报。今天是 ${dateKey}。请用中文回答。` },
            ...messagesToSend
          ],
          max_tokens: 1000, temperature: 0.7
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API 错误 (${response.status}): ${errText.slice(0, 100)}`);
      }
      const data = await response.json();
      aiReply = data.choices?.[0]?.message?.content || '抱歉，API 没有返回有效内容。';
    }

    chatMessages.value.push({ role: 'assistant', content: aiReply });
  } catch (error) {
    console.error('Chat API Request failed:', error);
    chatMessages.value.push({ role: 'assistant', content: `⚠️ ${error.message || '连接 AI 助手失败，请检查模型设置。'}` });
  } finally {
    isChatLoading.value = false;
    scrollToBottom();
  }
};

// User Library
const loadUserLibrary = async () => {
  try {
    const libRes = await fetch(`${API_BASE}/api/articles?t=${Date.now()}`);
    if (libRes.ok) {
      const libData = await libRes.json();
      if (libData.success && Array.isArray(libData.articles)) {
        const nonUserArticles = rawArticles.value.filter(a => !a.isUserAdded);
        rawArticles.value = [...libData.articles, ...nonUserArticles];
      }
    }
  } catch (e) {
    console.warn('加载用户内容库失败:', e);
  }
};

// Lifecycle
onMounted(async () => {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark');
  }

  const today = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const dateKey = today.toISOString().split('T')[0];
  displayDateStr.value = formatDate(today);

  try {
    const historyUrl = `${R2_BASE_URL}/data/history.json?t=${Date.now()}`;
    const res = await fetch(historyUrl);
    if (res.ok) {
      const allData = await res.json();
      rawArticles.value = allData.map(a => ({
        ...a, collectedAt: a.collectedAt || today.toISOString()
      })).reverse();
    }

    try {
      const libRes = await fetch(`${API_BASE}/api/articles?t=${Date.now()}`);
      if (libRes.ok) {
        const libData = await libRes.json();
        if (libData.success && Array.isArray(libData.articles)) {
          for (const article of libData.articles) {
            if (!rawArticles.value.find(a => a.url === article.url)) {
              rawArticles.value.unshift(article);
            }
          }
        }
      }
    } catch (e) {
      console.warn('加载用户内容库失败:', e);
    }

    const githubUrl = `${R2_BASE_URL}/data/github_trending.json?t=${Date.now()}`;
    const githubRes = await fetch(githubUrl);
    if (githubRes.ok) githubTrendingData.value = await githubRes.json();

    await Promise.all([loadUserEdits(), loadNotes(), loadUserSubUrls(), loadBriefing()]);
    availableCategories.value = [...new Set(stats.value.map(s => s.label))];
  } catch (error) {
    console.error('加载历史数据失败:', error);
  } finally {
    isLoading.value = false;
  }

  const mp3Url = `${R2_BASE_URL}/podcasts/${dateKey}.mp3?t=${Date.now()}`;
  audioPlayer = new Audio(mp3Url);
  window.audioPlayer = audioPlayer;
  audioPlayer.addEventListener('ended', () => { isPlaying.value = false; });
  audioPlayer.addEventListener('error', () => { hasAudio.value = false; });
  audioPlayer.addEventListener('canplay', () => { hasAudio.value = true; });
  audioPlayer.volume = 1;
  audioPlayer.muted = false;
  audioPlayer.load();
});

onUnmounted(() => {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }
});
</script>
