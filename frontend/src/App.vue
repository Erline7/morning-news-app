<template>
  <div :class="{ 'dark': isDarkMode }" class="h-screen w-full flex font-sans overflow-hidden bg-white text-gray-800 dark:bg-[#121212] dark:text-gray-200 selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">

    <!-- ================= 1. Sidebar ================= -->
    <div class="w-64 bg-[#F8F9FA] dark:bg-[#1A1A1A] h-full flex flex-col border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-colors">
      <div class="h-16 flex items-center px-6 font-bold text-xl text-gray-900 dark:text-white">
        <div class="w-8 h-8 bg-[#2D3A5F] dark:bg-[#3D4F7C] rounded-lg flex items-center justify-center mr-3 text-white">
          <Layers :size="18" />
        </div>
        DailyBrief
      </div>

      <div class="flex-1 overflow-y-auto py-6 px-3">
        <button
          @click="activeTab = 'brief'"
          class="w-full flex items-center px-3 py-2.5 rounded-lg mb-2 transition-colors text-left"
          :class="activeTab === 'brief'
            ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-400'"
        >
          <Home :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
          今日简报
        </button>

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
              @click="activeFilter = '全部'; activeTab = 'content'"
              class="w-full px-3 py-2 text-sm rounded-lg flex justify-between items-center text-left transition-colors"
              :class="activeFilter === '全部' && activeTab === 'content'
                ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]'"
            >
              <span>全部内容</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ totalArticles }}</span>
            </button>
            <button
              v-for="stat in stats"
              :key="stat.label"
              @click="activeFilter = stat.label; activeTab = 'content'"
              class="w-full px-3 py-1.5 text-sm rounded-lg flex justify-between items-center text-left transition-colors"
              :class="activeFilter === stat.label && activeTab === 'content'
                ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]'"
            >
              <span>{{ stat.label }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ stat.count }}</span>
            </button>
          </div>
        </div>

        <button
          @click="activeTab = 'chat'"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-4 transition-colors text-left"
          :class="activeTab === 'chat'
            ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-400'"
        >
          <div class="flex items-center">
            <MessageSquare :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
            AI Chat
          </div>
          <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
        </button>

        <button
          @click="activeTab = 'notes'"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
          :class="activeTab === 'notes'
            ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-400'"
        >
          <div class="flex items-center">
            <StickyNote :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
            我的笔记
          </div>
          <span v-if="notes.length > 0" class="text-xs text-gray-400 dark:text-gray-500">{{ notes.length }}</span>
        </button>

        <button
          @click="activeTab = 'subscriptions'"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
          :class="activeTab === 'subscriptions'
            ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-400'"
        >
          <div class="flex items-center">
            <Rss :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
            我的链接
          </div>
          <span v-if="userSubUrls.length > 0" class="text-xs text-gray-400 dark:text-gray-500">{{ userSubUrls.length }}</span>
        </button>

        <!-- Daily Report Link -->
        <button
          @click="activeTab = 'report'; loadReport()"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
          :class="activeTab === 'report'
            ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-400'"
        >
          <div class="flex items-center">
            <ClipboardList :size="18" class="mr-3 text-gray-500 dark:text-gray-400" />
            每日复盘
          </div>
        </button>

        <!-- Timeline Link -->
        <button
          @click="activeTab = 'timeline'; loadTimeline()"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mt-2 transition-colors text-left"
          :class="activeTab === 'timeline'
            ? 'bg-[#EDEFF2] dark:bg-[#2D3A5F]/40 text-gray-900 dark:text-white font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-400'"
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

    <!-- ================= 2. Main Content Area ================= -->
    <div class="flex-1 flex flex-col min-w-0 bg-[#FBFBFB] dark:bg-[#161616] transition-colors">

      <header class="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md sticky top-0 z-20 flex-shrink-0 transition-colors">
        <div class="text-gray-500 dark:text-gray-400 font-medium text-sm flex items-center">
          <span v-if="activeTab === 'chat'" class="flex items-center">
            <MessageSquare :size="16" class="mr-2" />
            AI Assistant
          </span>
          <span v-else-if="activeTab === 'content'" class="flex items-center">
            <BookOpen :size="16" class="mr-2" />
            Content Library
          </span>
          <span v-else-if="activeTab === 'notes'" class="flex items-center">
             <StickyNote :size="16" class="mr-2" />
             Notes
          </span>
          <span v-else-if="activeTab === 'subscriptions'" class="flex items-center">
             <Rss :size="16" class="mr-2" />
             Subscriptions
          </span>
          <span v-else-if="activeTab === 'report'" class="flex items-center">
             <ClipboardList :size="16" class="mr-2" />
             Daily Report
          </span>
          <span v-else-if="activeTab === 'timeline'" class="flex items-center">
             <Clock :size="16" class="mr-2" />
             每日记录
          </span>
          <span v-else class="flex items-center">
             <Home :size="16" class="mr-2" />
             Dashboard
          </span>
        </div>
        <div class="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
          <span>{{ displayDateStr }}</span>
          <div class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] p-1.5 rounded-lg transition-colors">
            <div class="w-7 h-7 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-xs">M</div>
            <span class="font-medium text-gray-800 dark:text-gray-200">Admin</span>
          </div>
          <div class="flex items-center space-x-4 border-l border-gray-200 dark:border-gray-800 pl-4">
            <button @click="toggleDarkMode" class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center">
              <Sun v-if="isDarkMode" :size="18" class="text-yellow-500 fill-current" />
              <Moon v-else :size="18" />
            </button>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto relative" ref="scrollContainer">

        <!-- Loading -->
        <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-[#FBFBFB] dark:bg-[#161616] z-50">
          <Loader2 :size="40" class="animate-spin text-blue-500 mb-4" />
          <p class="text-gray-500 dark:text-gray-400">正在同步今日知识库情报...</p>
        </div>

        <!-- ================= BRIEFING PAGE ================= -->
        <main v-else-if="activeTab === 'brief'" class="max-w-5xl mx-auto px-8 md:px-12 py-12">
          <div class="mb-14">
            <div class="text-[11px] font-semibold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase mb-3">Daily Intelligence Brief</div>
            <h1 class="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4 tracking-tight">{{ displayDateStr }}</h1>
            <p class="text-gray-500 dark:text-gray-400 text-sm">今日共更新 <span class="font-semibold text-gray-700 dark:text-gray-300">{{ todayArticlesCount }}</span> 篇情报</p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="bg-white dark:bg-[#1A1A1A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-28 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer"
              @click="activeFilter = stat.label; activeTab = 'content'"
            >
              <div class="flex items-center text-gray-500 dark:text-gray-400 text-[13px] font-medium">
                <Activity :size="16" class="mr-2" />
                {{ stat.label }}
              </div>
              <div class="text-3xl font-serif text-gray-900 dark:text-white">{{ stat.count }}</div>
            </div>
          </div>

          <!-- 今日简报 -->
          <div class="mb-16">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                <BookOpen :size="16" class="mr-2" />
                今日简报
              </div>
              <button
                v-if="hasAudio"
                @click="toggleAudio"
                class="flex items-center px-4 py-2 bg-[#2D3A5F] dark:bg-[#3D4F7C] hover:bg-[#1f2844] dark:hover:bg-[#2D3A5F] text-white text-xs font-medium rounded-full transition-all shadow-sm active:scale-95"
              >
                <Volume2 v-if="isPlaying" :size="14" class="mr-2" />
                <Play v-else :size="14" class="mr-2 fill-current" />
                {{ isPlaying ? '暂停收听' : '收听音频' }}
              </button>
              <button
                v-else
                disabled
                class="flex items-center px-4 py-2 bg-gray-100 dark:bg-[#222] text-gray-400 dark:text-gray-600 text-xs font-medium rounded-full cursor-not-allowed"
              >
                <Volume2 :size="14" class="mr-2" /> 播客生成中...
              </button>
            </div>

            <div class="bg-white dark:bg-[#1A1A1A] p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">今日要点</h2>

              <!-- 优先显示 KV 里的 AI 生成简报 -->
              <div v-if="dailyBriefing" class="prose prose-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-none whitespace-pre-wrap" v-html="formatBriefing(dailyBriefing)"></div>

              <!-- Fallback：本地聚合的分类摘要 -->
              <div v-else class="space-y-8">
                <div v-for="(section, sIdx) in briefingData" :key="sIdx">
                  <h3 class="text-[15px] font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span class="mr-2">{{ getCategoryEmoji(section.category) }}</span> {{ section.category }}
                  </h3>
                  <div class="space-y-4">
                    <div v-for="(item, iIdx) in section.items" :key="iIdx" class="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">
                      <a :href="item.url" target="_blank" class="text-gray-900 dark:text-white font-bold hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer">
                        {{ item.title }}
                      </a> — {{ item.desc }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!dailyBriefing && briefingData.length === 0" class="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
                <p>今天暂无高优情报更新</p>
              </div>
            </div>
          </div>

          <!-- GitHub Trending（单独区域） -->
          <div v-if="githubTrending.length > 0" class="mb-20">
            <div class="flex items-center text-xs font-semibold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-5">
              <TrendingUp :size="14" class="mr-2" />
              GITHUB TRENDING · 今日热门开源项目
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

        <!-- ================= CONTENT LIBRARY PAGE ================= -->
        <main v-else-if="activeTab === 'content'" class="max-w-5xl mx-auto px-8 md:px-12 py-12">

          <div v-if="!selectedArticle">
            <div class="flex items-center mb-6">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">知识情报库</h2>
              <span class="ml-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#222] px-3 py-1 rounded-full">{{ filteredArticles.length }} 篇</span>
            </div>

            <!-- 搜索框 -->
            <div class="mb-4 relative">
              <input
                v-model="contentSearchQuery"
                type="text"
                placeholder="搜索文章标题、分类、来源..."
                class="w-full px-4 py-2.5 pl-10 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 dark:text-gray-200"
              />
              <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button v-if="contentSearchQuery" @click="contentSearchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X :size="14" />
              </button>
            </div>

            <!-- 添加链接 -->
            <div class="mb-6">
              <div class="flex items-center gap-2">
                <input
                  v-model="customUrl"
                  @keydown.enter="handleAddUrl"
                  :disabled="isCheckingUrl"
                  placeholder="输入文章链接，抓取并保存..."
                  class="flex-1 px-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 disabled:opacity-60"
                />
                <button
                  @click="handleAddUrl"
                  :disabled="!customUrl.trim() || isCheckingUrl"
                  class="px-4 py-2.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] disabled:opacity-50 transition-all flex items-center min-w-[90px] justify-center"
                >
                  <Loader2 v-if="isCheckingUrl" :size="16" class="animate-spin" />
                  <span v-else class="flex items-center">
                    <Plus :size="16" class="mr-1" />
                    抓取
                  </span>
                </button>
              </div>

              <!-- 抓取结果预览 -->
              <div v-if="urlCheckResult" class="mt-3 p-4 rounded-xl border" :class="urlCheckResult.success ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20' : 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20'">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">{{ urlCheckResult.title || urlCheckResult.url }}</div>
                    <a :href="urlCheckResult.url" target="_blank" class="text-xs text-blue-500 hover:underline truncate block">{{ urlCheckResult.url }}</a>
                    <p v-if="urlCheckResult.summary" class="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">{{ urlCheckResult.summary }}</p>
                    <p v-if="urlCheckResult.category && urlCheckResult.success" class="text-xs text-blue-500 mt-1">分类：{{ urlCheckResult.category }}</p>
                    <p v-if="urlCheckResult.justSaved" class="text-xs text-emerald-500 mt-2">✓ 已保存到内容库</p>
                    <p v-if="!urlCheckResult.success" class="text-xs text-red-500 mt-2">{{ urlCheckResult.error || '抓取失败' }}，只能保存链接</p>
                  </div>
                  <div class="flex gap-2 ml-4 flex-shrink-0">
                    <button
                      v-if="urlCheckResult.success && !urlCheckResult.justSaved"
                      @click="saveLinkAll()"
                      class="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
                    >
                      保存到内容库
                    </button>
                    <button
                      v-if="!urlCheckResult.success && !urlCheckResult.justSaved"
                      @click="saveLinkOnly()"
                      class="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap"
                    >
                      仅保存链接
                    </button>
                    <button
                      v-if="!urlCheckResult.justSaved"
                      @click="urlCheckResult = null"
                      class="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Filters -->
            <div class="flex space-x-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              <button
                v-for="f in ['全部', ...stats.map(s => s.label)]"
                :key="f"
                @click="activeFilter = f"
                class="px-5 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all border"
                :class="activeFilter === f
                  ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white border-[#2D3A5F] dark:border-[#3D4F7C] shadow-sm'
                  : 'bg-white dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#252525]'"
              >
                {{ f }}
              </button>
            </div>

            <!-- Grid Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="article in filteredArticles"
                :key="article.url"
                @click="selectedArticle = article; recordEvent('article_read', article.title, { articles: [article.url], tags: [article.category].filter(Boolean) })"
                class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer flex flex-col h-56 group"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="relative" @click.stop>
                    <span
                      class="px-2.5 py-1 bg-[#F4F6F8] dark:bg-[#252525] text-[#2D3A5F] dark:text-blue-300 text-xs font-semibold rounded-md cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all inline-flex items-center whitespace-nowrap"
                      :title="getUserEdit(article.url) ? '已手动修改分类，点击可再编辑' : '点击编辑分类（当前为AI分类）'"
                      @click="openCategoryEditor(article)"
                    >
                      {{ article.category }}
                      <Pencil :size="10" class="inline ml-1 opacity-50" />
                    </span>
                    <span
                      v-if="getUserEdit(article.url)"
                      class="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full"
                      title="用户已修改此分类"
                    ></span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="article.isUserAdded"
                      class="text-[10px] font-medium px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded"
                      title="用户添加"
                    >用户</span>
                  </div>
                </div>
                <h3 class="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" :title="article.title">
                  {{ article.title }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{{ article.summary }}</p>
                <div class="flex-1"></div>
                <div class="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800/60 pt-4 mt-2">
                  <span class="font-medium truncate max-w-[70%]">{{ article.source }}</span>
                  <div class="flex items-center gap-2">
                    <button
                      @click.stop="toggleStar(article)"
                      :title="article.isStarred ? '取消收藏' : '收藏'"
                      class="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"
                    >
                      <Star :size="14" :class="article.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'" />
                    </button>
                    <button
                      @click.stop="deleteArticle(article)"
                      title="删除"
                      class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-gray-400 hover:text-red-500"
                    >
                      <Trash2 :size="14" />
                    </button>
                    <span class="flex items-center whitespace-nowrap"><Clock :size="12" class="mr-1" />{{ formatDateDisplay(article.collectedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div><!-- 结束 v-if="!selectedArticle" -->

          <!-- 详细文章页 -->
          <div v-else class="max-w-3xl mx-auto">
            <button
              @click="selectedArticle = null"
              class="mb-8 flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              ← 返回内容列表
            </button>

            <div class="bg-white dark:bg-[#1A1A1A] p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div class="flex items-center gap-3 mb-6">
                <div class="relative inline-block" @click.stop>
                  <span
                    class="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all inline-flex items-center"
                    @click="openCategoryEditor(selectedArticle)"
                  >
                    {{ selectedArticle.category }}
                    <Pencil :size="12" class="ml-1.5 opacity-60" />
                  </span>
                  <span
                    v-if="getUserEdit(selectedArticle.url)"
                    class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 ring-2 ring-white dark:ring-[#1A1A1A] rounded-full"
                    title="用户已修改"
                  ></span>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ selectedArticle.source }}</span>
                <span
                  v-if="selectedArticle.isUserAdded"
                  class="text-[10px] font-medium px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded"
                >用户添加</span>
              </div>

              <h1 class="text-3xl font-bold leading-tight text-gray-900 dark:text-white mb-6">
                {{ selectedArticle.title }}
              </h1>

              <div class="prose prose-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-none">
                <p>{{ selectedArticle.summary }}</p>
              </div>

              <!-- 邮件/原始内容展示 -->
              <div v-if="selectedArticle.content" class="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center">
                  <BookOpen :size="14" class="mr-2" />
                  {{ selectedArticle.isEmail ? '邮件原文' : '原文内容' }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto bg-gray-50 dark:bg-[#121212] rounded-xl p-5">
                  {{ selectedArticle.content }}
                </div>
              </div>

              <div class="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
                <a
                  v-if="selectedArticle.url && selectedArticle.url.startsWith('http')"
                  :href="selectedArticle.url"
                  target="_blank"
                  class="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  阅读原文 <ExternalLink :size="16" class="ml-1" />
                </a>
                <span v-else class="text-gray-400 dark:text-gray-500 text-sm flex items-center">
                  <Mail :size="14" class="mr-1.5" /> 邮件内容
                </span>
                <span class="text-gray-400 dark:text-gray-500 flex items-center">
                  <Clock :size="14" class="mr-1" />
                  {{ formatDateDisplay(selectedArticle.collectedAt) }}
                </span>
              </div>
            </div>
          </div>
        </main>

        <!-- ================= CHAT PAGE ================= -->
        <main v-if="activeTab === 'chat'" class="h-full flex flex-col max-w-4xl mx-auto">
          <div class="py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div class="flex items-center justify-between px-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Knowledge Retrieval Chat</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">基于今日 {{ totalArticles }} 篇情报的智能问答</p>
              </div>
              <button
                @click="showModelSelector = !showModelSelector"
                class="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-colors"
                :class="selectedModel.id !== 'default' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222]'"
              >
                <Cpu :size="14" />
                {{ selectedModel.name }}
                <ChevronDown :size="12" class="transition-transform" :class="{ 'rotate-180': showModelSelector }" />
              </button>
            </div>

            <!-- 模型选择器面板 -->
            <div v-if="showModelSelector" class="mx-6 mt-3 p-4 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-gray-700">
              <div class="mb-3">
                <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">选择模型</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="model in PRESET_MODELS"
                    :key="model.id"
                    @click="chatModelId = model.id; saveModelConfig()"
                    class="px-3 py-2 text-xs rounded-lg border text-left transition-all"
                    :class="chatModelId === model.id
                      ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white border-[#2D3A5F] dark:border-[#3D4F7C]'
                      : 'bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'"
                  >
                    {{ model.name }}
                  </button>
                </div>
              </div>

              <!-- 自定义模型设置 -->
              <div v-if="selectedModel.provider === 'custom'" class="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Base URL</label>
                  <input
                    v-model="customBaseURL"
                    @change="saveModelConfig"
                    placeholder="https://api.openai.com/v1"
                    class="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Model Name</label>
                  <input
                    v-model="customModelName"
                    @change="saveModelConfig"
                    placeholder="gpt-4o-mini"
                    class="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">API Key</label>
                  <input
                    v-model="customApiKey"
                    @change="saveModelConfig"
                    type="password"
                    placeholder="sk-..."
                    class="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 dark:text-gray-200"
                  />
                </div>
              </div>

              <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                💡 配置保存在浏览器本地，不会上传到服务器
              </p>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-6" ref="chatMessagesRef">
            <div
              v-for="(msg, idx) in chatMessages"
              :key="idx"
              class="flex"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div v-if="msg.role === 'assistant'" class="w-8 h-8 rounded-full bg-[#2D3A5F] dark:bg-[#3D4F7C] flex items-center justify-center mr-3 flex-shrink-0 text-white mt-1 shadow-sm">
                <Bot :size="16" />
              </div>
              <div
                class="max-w-[80%] px-5 py-3.5 text-[14px] leading-relaxed shadow-sm"
                :class="msg.role === 'user'
                  ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm whitespace-pre-wrap'"
              >
                {{ msg.content }}
              </div>
            </div>
          </div>

          <div class="p-6 bg-white/50 dark:bg-[#161616]/50 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div class="relative flex items-center">
              <input
                type="text"
                v-model="chatInput"
                @keydown.enter="sendMessage"
                placeholder="询问关于今日简报的细节... (Enter 发送)"
                class="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-5 py-3.5 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-300 transition-all shadow-sm text-sm"
              />
              <button
                @click="sendMessage"
                :disabled="!chatInput.trim() || isChatLoading"
                class="absolute right-2 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                :class="chatInput.trim() ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white hover:bg-[#1f2844] shadow-sm' : 'bg-gray-100 dark:bg-[#222] text-gray-400 dark:text-gray-600 cursor-not-allowed'"
              >
                <Send v-if="!isChatLoading" :size="16" class="ml-0.5" />
                <Loader2 v-else :size="16" class="animate-spin" />
              </button>
            </div>
            <div class="text-center mt-3 text-[11px] text-gray-400 dark:text-gray-500">
              💡 提示：云端 AI 将基于你的历史数据库为你深度解答。
            </div>
          </div>
        </main>

        <!-- ================= CATEGORY EDITOR MODAL ================= -->
        <div v-if="showCategoryEditor" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showCategoryEditor = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md mx-4 p-6">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">修改分类</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{{ editingArticle?.title }}</p>
            <div class="mb-4">
              <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">选择分类</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="cat in availableCategories"
                  :key="cat"
                  @click="newCategory = cat"
                  class="px-3 py-1.5 text-sm rounded-lg border transition-all"
                  :class="newCategory === cat
                    ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white border-[#2D3A5F] dark:border-[#3D4F7C]'
                    : 'bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'"
                >
                  {{ cat }}
                </button>
              </div>
            </div>
            <div class="mb-6">
              <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">或创建新分类</label>
              <input
                v-model="newCategory"
                placeholder="输入新分类名称..."
                class="w-full px-4 py-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
              />
            </div>
            <div class="flex justify-end gap-3">
              <button @click="showCategoryEditor = false" class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">取消</button>
              <button
                @click="saveCategoryEdit"
                :disabled="!newCategory.trim() || newCategory === editingArticle?.category"
                class="px-5 py-2 text-sm bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white rounded-lg hover:bg-[#1f2844] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >保存</button>
            </div>
          </div>
        </div>

        <!-- ================= NOTES PAGE ================= -->
        <main v-if="activeTab === 'notes'" class="max-w-5xl mx-auto px-8 md:px-12 py-12 h-full overflow-y-auto">
          <div v-if="!selectedNote">
            <div class="flex items-center justify-between mb-8">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">我的笔记</h2>
              <button @click="createNote" class="flex items-center px-4 py-2 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] transition-colors shadow-sm">
                <Plus :size="16" class="mr-2" />新建笔记
              </button>
            </div>
            <div v-if="notes.length === 0" class="text-center py-20">
              <StickyNote :size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p class="text-gray-500 dark:text-gray-400 text-sm">还没有笔记，点击「新建笔记」开始记录你的感悟</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="note in sortedNotes"
                :key="note.id"
                @click="selectedNote = note"
                class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer flex flex-col h-52 group"
              >
                <h3 class="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ note.title || '无标题' }}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-2 flex-1">{{ note.content || '无内容' }}</p>
                <div class="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800/60 pt-3 mt-auto">
                  <span class="flex items-center" :title="'创建于 ' + formatDateDisplay(note.createdAt)"><Calendar :size="12" class="mr-1" />{{ formatDateDisplay(note.createdAt) }}</span>
                  <span v-if="note.linkedArticles?.length > 0" class="flex items-center text-blue-500" :title="note.linkedArticles.length + ' 篇关联文章'"><Link :size="12" class="mr-1" />{{ note.linkedArticles.length }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="max-w-3xl mx-auto">
            <div class="flex items-center justify-between mb-6">
              <button @click="selectedNote = null" class="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">← 返回笔记列表</button>
              <div class="flex gap-2">
                <button @click="insertArticleLink" class="flex items-center px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"><Link :size="14" class="mr-1.5" />插入原文摘要</button>
                <button @click="deleteNote" class="flex items-center px-3 py-1.5 text-xs border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"><Trash2 :size="14" class="mr-1.5" />删除</button>
              </div>
            </div>
            <div class="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div class="p-8 pb-4">
                <input v-model="selectedNote.title" @input="markNoteDirty" placeholder="笔记标题..." class="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-4" />
              </div>
              <div class="px-8 pb-4">
                <textarea v-model="selectedNote.content" @input="markNoteDirty" placeholder="写下你的感悟..." class="w-full h-72 text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-gray-100 dark:border-gray-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 resize-none"></textarea>
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
                <span>创建于 {{ formatDateDisplay(selectedNote.createdAt) }}</span>
                <span>最后修改 {{ formatDateDisplay(selectedNote.updatedAt) }}</span>
              </div>
            </div>
            <div class="mt-4 text-center">
              <button @click="saveNote" class="px-8 py-2.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] transition-colors shadow-sm disabled:opacity-50" :disabled="!isNoteDirty">{{ isNoteDirty ? '保存笔记' : '已保存' }}</button>
            </div>
          </div>

          <div v-if="showArticlePicker" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showArticlePicker = false">
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div class="relative bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
              <div class="p-6 border-b border-gray-100 dark:border-gray-800">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">选择要关联的文章</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">点击文章插入为摘要超链接</p>
                <!-- 搜索框 -->
                <div class="mt-3 relative">
                  <input
                    v-model="articleSearchQuery"
                    type="text"
                    placeholder="搜索文章标题、分类、来源..."
                    class="w-full px-4 py-2 pl-10 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 dark:text-gray-200"
                  />
                  <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button v-if="articleSearchQuery" @click="articleSearchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X :size="14" />
                  </button>
                </div>
              </div>
              <div class="flex-1 overflow-y-auto p-4 space-y-2">
                <button v-for="article in filteredPickerArticles" :key="article.url" @click="pickArticle(article)" class="w-full text-left p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#222] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                  <div class="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{{ article.title }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{{ article.summary }}</div>
                  <div class="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-3">
                    <span>{{ article.category }}</span><span>{{ article.source }}</span><span>{{ formatDateDisplay(article.collectedAt) }}</span>
                  </div>
                </button>
                <div v-if="filteredPickerArticles.length === 0" class="text-center py-10 text-gray-400 text-sm">
                  没有找到匹配的文章
                </div>
              </div>
              <div class="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span class="text-xs text-gray-400">共 {{ filteredPickerArticles.length }} 篇</span>
                <button @click="showArticlePicker = false" class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg">取消</button>
              </div>
            </div>
          </div>
        </main>

        <!-- ================= 我的链接 PAGE ================= -->
        <main v-if="activeTab === 'subscriptions'" class="max-w-5xl mx-auto px-8 md:px-12 py-12">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">我的链接</h2>
            <span class="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#222] px-3 py-1 rounded-full">{{ userSubUrls.length }} 个链接</span>
          </div>

          <!-- 添加链接 -->
          <div class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">添加新链接</h3>
            <div class="flex gap-3">
              <input
                v-model="customUrl"
                @keydown.enter="handleAddUrl"
                placeholder="输入文章 URL..."
                class="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 dark:text-gray-200"
              />
              <button
                @click="handleAddUrl"
                :disabled="!customUrl.trim() || isCheckingUrl"
                class="px-5 py-2.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] disabled:opacity-50 transition-colors"
              >
                <Loader2 v-if="isCheckingUrl" :size="16" class="animate-spin" />
                <span v-else>抓取</span>
              </button>
            </div>

            <!-- 抓取结果预览 -->
            <div v-if="urlCheckResult" class="mt-4 p-4 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-gray-700">
              <div v-if="urlCheckResult.success" class="space-y-2">
                <div class="flex items-start gap-2">
                  <Link :size="16" class="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ urlCheckResult.title }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{{ urlCheckResult.url }}</p>
                  </div>
                </div>
                <p v-if="urlCheckResult.summary" class="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{{ urlCheckResult.summary }}</p>
                <div class="flex gap-2 mt-3">
                  <button @click="saveLinkAll()" class="px-3 py-1.5 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-xs rounded-lg hover:bg-[#1f2844]">
                    保存到内容库
                  </button>
                  <button @click="urlCheckResult = null" class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-[#222]">
                    取消
                  </button>
                </div>
              </div>
              <div v-else class="text-sm text-red-500">
                <p class="font-medium">抓取失败</p>
                <p class="text-xs text-gray-500 mt-1">{{ urlCheckResult.error || '无法读取该网站' }}</p>
                <div class="flex gap-2 mt-3">
                  <button @click="saveLinkOnly()" class="px-3 py-1.5 bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300">
                    仅保存链接
                  </button>
                  <button @click="urlCheckResult = null" class="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-[#222]">
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 链接列表 -->
          <div v-if="userSubUrls.length === 0" class="text-center py-20">
            <Link :size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p class="text-gray-500 dark:text-gray-400 text-sm">还没有保存任何链接，在上方输入 URL 添加</p>
          </div>

          <div class="space-y-3">
            <div
              v-for="sub in userSubUrls"
              :key="sub.url"
              class="bg-white dark:bg-[#1A1A1A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <Link :size="16" class="text-blue-500 flex-shrink-0" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ sub.title || sub.url }}</span>
                  <span v-if="sub.hasContent" class="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded">已抓取</span>
                </div>
                <p v-if="sub.summary || sub.content" class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-1">{{ sub.summary || sub.content }}</p>
                <a :href="sub.url" target="_blank" class="text-xs text-blue-500 dark:text-blue-400 hover:underline truncate block">{{ sub.url }}</a>
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  添加于 {{ formatDateDisplay(sub.addedAt) }}
                </div>
              </div>
              <div class="flex flex-col gap-2 ml-4">
                <button
                  v-if="!sub.inLibrary"
                  @click="addToLibrary(sub)"
                  class="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  title="添加到内容库"
                >
                  加入内容
                </button>
                <span
                  v-if="sub.inLibrary"
                  class="px-3 py-1.5 text-xs bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 rounded-lg"
                >
                  已加入内容库
                </span>
                <button
                  v-if="sub.hasContent"
                  @click="viewLinkContent(sub)"
                  class="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                >
                  查看
                </button>
                <button
                  @click="removeSubscription(sub.url)"
                  class="px-3 py-1.5 text-xs border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <!-- 内容预览 Modal -->
          <div v-if="viewingLink" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="viewingLink = null">
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
                <button @click="viewingLink = null" class="px-4 py-2 bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">
                  关闭
                </button>
              </div>
            </div>
          </div>
        </main>

        <!-- ================= DAILY REPORT PAGE ================= -->
        <main v-if="activeTab === 'report'" class="max-w-5xl mx-auto px-8 md:px-12 py-12">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">每日复盘</h2>
            <button
              @click="loadReport"
              :disabled="isGeneratingReport"
              class="flex items-center px-4 py-2 bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white text-sm font-medium rounded-lg hover:bg-[#1f2844] disabled:opacity-50 transition-colors shadow-sm"
            >
              <Loader2 v-if="isGeneratingReport" :size="16" class="mr-2 animate-spin" />
              <RefreshCw v-else :size="16" class="mr-2" />
              {{ isGeneratingReport ? '加载中...' : '刷新' }}
            </button>
          </div>

          <div v-if="!dailyReport" class="text-center py-20">
            <ClipboardList :size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">今日还没有复盘报告</p>
          </div>

          <div v-else class="space-y-6">
            <!-- 概览卡片 -->
            <div class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ dailyReport.date }}</div>
              <div class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ dailyReport.summary }}</div>
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                  <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ dailyReport.questionCount || 0 }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">今日提问</div>
                </div>
                <div class="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                  <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ dailyReport.noteCount || 0 }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">今日笔记</div>
                </div>
                <div class="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
                  <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ dailyReport.coreThemes?.length || 0 }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">核心主题</div>
                </div>
              </div>
            </div>

            <!-- 思考轴 -->
            <div v-if="dailyReport.thinkingAxis?.length > 0" class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                <GitBranch :size="16" class="mr-2" />
                今日思考轴
              </div>
              <div class="flex items-center gap-2 overflow-x-auto pb-2">
                <div
                  v-for="(node, idx) in dailyReport.thinkingAxis"
                  :key="idx"
                  class="flex items-center"
                >
                  <div class="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm rounded-lg whitespace-nowrap">
                    {{ node }}
                  </div>
                  <ChevronRight v-if="idx < dailyReport.thinkingAxis.length - 1" :size="16" class="mx-1 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            </div>

            <!-- 核心主题 -->
            <div v-if="dailyReport.coreThemes?.length > 0" class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                <Tag :size="16" class="mr-2" />
                核心关注主题
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="theme in dailyReport.coreThemes"
                  :key="theme"
                  class="px-3 py-1.5 bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 text-sm rounded-lg"
                >
                  {{ theme }}
                </span>
              </div>
            </div>

            <!-- AI 洞察 -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50">
              <div class="flex items-center text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">
                <Sparkles :size="16" class="mr-2" />
                今日洞察
              </div>
              <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{{ dailyReport.insight || '暂无洞察' }}</p>
              <div v-if="dailyReport.tomorrowSuggestion" class="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                <div class="text-xs text-blue-600 dark:text-blue-400 mb-1">明日建议</div>
                <p class="text-gray-700 dark:text-gray-300 text-sm">{{ dailyReport.tomorrowSuggestion }}</p>
              </div>
            </div>
          </div>
        </main>

        <!-- ================= TIMELINE PAGE ================= -->
        <main v-if="activeTab === 'timeline'" class="max-w-5xl mx-auto px-8 md:px-12 py-12 h-full overflow-y-auto">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">每日记录</h2>
            <button
              @click="loadTimeline"
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
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    {{ getThreadDays(thread) }}天
                  </span>
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
          <div v-if="timelineAnalysis && timelineAnalysis.narrative" class="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <div class="flex items-center text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3">
              <Sparkles :size="16" class="mr-2" />
              今日叙事
            </div>
            <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{{ timelineAnalysis.narrative }}</p>
          </div>

          <!-- 时间线 -->
          <div class="mb-8">
            <div class="flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
              <Clock :size="16" class="mr-2" />
              行为时间线
            </div>
            <div v-if="timelineEvents.length === 0" class="text-center py-12 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800">
              <Clock :size="40" class="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p class="text-gray-500 dark:text-gray-400 text-sm">今天还没有记录任何行为</p>
            </div>
            <div v-else class="relative">
              <div class="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>
              <div
                v-for="event in timelineEvents"
                :key="event.id"
                class="relative pl-14 pb-6"
              >
                <div class="absolute left-4 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#1A1A1A]" :class="getEventColor(event.type)"></div>
                <div class="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-medium" :class="getEventTextColor(event.type)">{{ getEventLabel(event.type) }}</span>
                      <span v-if="event.refs?.threads?.length > 0" class="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                        脉络
                      </span>
                    </div>
                    <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatEventTime(event.timestamp) }}</span>
                  </div>
                  <div class="text-sm text-gray-800 dark:text-gray-200 font-medium">{{ event.title }}</div>
                  <p v-if="event.content" class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{{ event.content }}</p>
                  <div v-if="event.tags?.length > 0" class="flex flex-wrap gap-1 mt-2">
                    <span v-for="tag in event.tags" :key="tag" class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-gray-400 rounded">
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 复盘问题 -->
          <div v-if="timelineAnalysis && timelineAnalysis.followUpQuestions?.length > 0" class="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              <MessageSquare :size="16" class="mr-2" />
              今日复盘问题
            </div>
            <div class="space-y-3">
              <div
                v-for="(question, idx) in timelineAnalysis.followUpQuestions"
                :key="idx"
                class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#222] rounded-xl"
              >
                <span class="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold">{{ idx + 1 }}</span>
                <p class="text-sm text-gray-700 dark:text-gray-300">{{ question }}</p>
              </div>
            </div>
          </div>
        </main>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import {
  Layers, Home, BookOpen, MessageSquare, ChevronDown,
  Cpu, TrendingUp, Globe, Activity, Star,
  ExternalLink, Play, Volume2, Clock, Moon, Sun,
  Bot, Send, Loader2, Briefcase, Zap,
  StickyNote, Plus, Trash2, Pencil, Calendar, Link, Rss,
  ClipboardList, RefreshCw, GitBranch, Tag, Sparkles, ChevronRight, Search, X, Check, Mail
} from 'lucide-vue-next';

// --- State ---
const activeTab = ref('brief');
const isCategoriesOpen = ref(true);
const activeFilter = ref('全部');
const isLoading = ref(true);
const selectedArticle = ref(null);
const scrollContainer = ref(null);
const chatMessagesRef = ref(null);

const isDarkMode = ref(false);
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'false');
  }
};

// --- Configuration ---
const R2_BASE_URL = 'https://cdn.secondmind.eu.cc';
const WORKER_CHAT_API = 'https://dailybrief-chat-api.erline68.workers.dev';
const API_BASE = 'https://dailybrief-api.erline68.workers.dev';

// 预设模型列表（OpenAI 兼容 API）
const PRESET_MODELS = [
  { id: 'default', name: '默认 (Worker API)', provider: 'worker', endpoint: WORKER_CHAT_API },
  { id: 'longcat', name: 'LongCat-2.0 (默认后端)', provider: 'worker-custom', endpoint: WORKER_CHAT_API, model: 'LongCat-2.0', baseURL: 'https://api.longcat.chat/openai/v1' },
  { id: 'deepseek', name: 'DeepSeek', provider: 'custom', model: 'deepseek-chat', baseURL: 'https://api.deepseek.com/v1' },
  { id: 'glm', name: '智谱 GLM', provider: 'custom', model: 'glm-4-flash', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'kimi', name: 'Kimi (月之暗面)', provider: 'custom', model: 'moonshot-v1-8k', baseURL: 'https://api.moonshot.cn/v1' },
  { id: 'qwen', name: '通义千问', provider: 'custom', model: 'qwen-plus', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'claude', name: 'Claude', provider: 'custom', model: 'claude-sonnet-4-20250514', baseURL: 'https://api.anthropic.com/v1' },
  { id: 'custom', name: '自定义 API', provider: 'custom' },
]

const rawArticles = ref([]);
const displayDateStr = ref('');
const githubTrendingData = ref([]);

const isPlaying = ref(false);
const hasAudio = ref(false);
let audioPlayer = null;

// --- Notes & Category State ---
const notes = ref([]);
const selectedNote = ref(null);
const showArticlePicker = ref(false);
const articleSearchQuery = ref('');
const contentSearchQuery = ref('');
const isNoteDirty = ref(false);
const showCategoryEditor = ref(false);
const editingArticle = ref(null);
const newCategory = ref('');
const userEdits = ref({});
const availableCategories = ref([]);

// --- Custom URL State ---
const customUrl = ref('');
const isCheckingUrl = ref(false);
const urlCheckResult = ref(null);
const userSubUrls = ref([]);

// --- Daily Report State ---
const dailyReport = ref(null);
const isGeneratingReport = ref(false);
const dailyBriefing = ref('');  // KV 里存储的 AI 生成简报全文
const dailyScript = ref('');    // 播客脚本

// --- Timeline & Memory State ---
const timelineEvents = ref([]);
const timelineAnalysis = ref(null);
const activeThreads = ref([]);

const formatDate = (date) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  return new Intl.DateTimeFormat('zh-CN', options).format(date);
};

const formatDateDisplay = (iso) => {
  if (!iso) return '—';
  return String(iso).slice(0, 10);
};

const getCategoryIcon = (category) => {
  if (category.includes('人工智能') || category.includes('AI')) return Cpu;
  if (category.includes('宏观经济') || category.includes('金融')) return TrendingUp;
  if (category.includes('互联网')) return Globe;
  if (category.includes('科技') || category.includes('前沿')) return Zap;
  if (category.includes('创投') || category.includes('政策')) return Briefcase;
  return Activity;
};

const getCategoryEmoji = (category) => {
  if (category.includes('人工智能') || category.includes('AI')) return '🤖';
  if (category.includes('宏观经济') || category.includes('金融')) return '📈';
  if (category.includes('互联网')) return '🌐';
  if (category.includes('科技') || category.includes('前沿')) return '🚀';
  if (category.includes('创投') || category.includes('政策')) return '💼';
  return '📰';
};

const getUserEdit = (url) => userEdits.value[url] || null;

const toggleAudio = () => {
  if (!audioPlayer) return;
  if (isPlaying.value) {
    audioPlayer.pause();
  } else {
    audioPlayer.play().catch(e => console.error('播放失败:', e));
  }
  isPlaying.value = !isPlaying.value;
};

// --- API calls ---
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
const sortedNotes = computed(() => {
  return [...notes.value].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
});

const createNote = () => {
  const now = new Date().toISOString();
  selectedNote.value = {
    id: 'note-' + Date.now(),
    title: '',
    content: '',
    linkedArticles: [],
    createdAt: now,
    updatedAt: now,
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
  const isNew = idx < 0;
  if (idx >= 0) notes.value[idx] = { ...selectedNote.value };
  else notes.value.unshift({ ...selectedNote.value });
  await saveNotes();
  isNoteDirty.value = false;

  // 记录事件
  const linkedUrls = (selectedNote.value.linkedArticles || []).map(a => a.url);
  await recordEvent(isNew ? 'note_created' : 'note_edited', selectedNote.value.title || '无标题', {
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

// 收藏文章（永久保存，不受30天清理影响）
const toggleStar = async (article) => {
  const previousState = article.isStarred;
  article.isStarred = !article.isStarred;
  // 同步到 KV/R2
  try {
    const res = await fetch(`${API_BASE}/api/articles/star`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: article.url, isStarred: article.isStarred }),
    });
    if (!res.ok) throw new Error('保存失败');
  } catch {
    // 失败则回滚
    article.isStarred = previousState;
  }
  // 记录事件
  if (article.isStarred) {
    recordEvent('article_starred', article.title, { articles: [article.url], tags: [article.category].filter(Boolean) });
  }
};

// 删除文章
const deleteArticle = async (article) => {
  if (!confirm(`确定要删除「${article.title}」吗？`)) return;
  // 从列表中移除
  rawArticles.value = rawArticles.value.filter(a => a.url !== article.url);
  // 同步到后端（标记为删除或从 R2 移除）
  try {
    await fetch(`${API_BASE}/api/articles/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: article.url }),
    });
    // 删除成功后重新加载内容库（同步 KV 和 R2 的删除）
    await loadUserLibrary();
  } catch (e) {
    // 失败则回滚
    rawArticles.value.push(article);
  }
};

// 我的链接 / 自定义 URL
const viewingLink = ref(null);

const viewLinkContent = (link) => {
  viewingLink.value = link;
};

// 抓取链接 → 显示预览（标题+摘要+分类）
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
    if (data.success) {
      urlCheckResult.value = {
        success: true,
        url: customUrl.value.trim(),
        title: data.title || customUrl.value.trim(),
        summary: data.summary || '',
        category: data.category || '未分类',
        hasSummary: !!data.summary,
      };
    } else {
      // 抓取失败 → 只保存裸链接
      urlCheckResult.value = {
        success: false,
        url: customUrl.value.trim(),
        error: data.error || '抓取失败',
      };
    }
  } catch (e) {
    urlCheckResult.value = {
      success: false,
      url: customUrl.value.trim(),
      error: '网络错误',
    };
  } finally {
    isCheckingUrl.value = false;
  }
};

// 保存到我的链接（无论是否抓取成功都可以）
const saveToMyLinks = async () => {
  if (!urlCheckResult.value) return;
  const item = urlCheckResult.value;
  const payload = {
    url: item.url,
    title: item.title || item.url,
    summary: item.summary || '',
    category: item.category || '未分类',
    hasSummary: !!item.success,
    action: 'add',
  };
  console.log('=== 保存到我的链接 ===');
  console.log('发送的数据:', payload);
  console.log('=== 结束 ===');
  try {
    const res = await fetch(`${API_BASE}/api/user-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    console.log('保存结果:', result);
    return true;
  } catch (e) {
    console.error('保存链接失败:', e);
    return false;
  }
};

// 保存到我的链接 + 同时添加到内容库
const saveToLibrary = async () => {
  if (!urlCheckResult.value || !urlCheckResult.value.success) return;
  const item = urlCheckResult.value;
  try {
    // 1. 添加到内容库
    const res = await fetch(`${API_BASE}/api/articles/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.title,
        url: item.url,
        source: '我的链接',
        summary: item.summary,
        category: item.category || '未分类',
        importance: 5,
        isUserAdded: true,
        collectedAt: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    console.log('saveToLibrary 结果:', data);
    return data.success;
  } catch (e) {
    console.error('添加到内容库失败:', e);
    return false;
  }
};

// 一键保存：链接→我的链接 + 内容→内容库
const saveLinkAll = async () => {
  if (!urlCheckResult.value) return;
  const hadSummary = urlCheckResult.value.success;

  // 如果有摘要，同时添加到内容库
  if (hadSummary) {
    await saveToLibrary();
  }
  // 无论如何都保存到我的链接
  await saveToMyLinks();

  // 显示成功提示
  urlCheckResult.value.justSaved = true;
  customUrl.value = '';
  await loadUserSubUrls();
  // 刷新内容库
  if (hadSummary) {
    await loadUserLibrary();
  }
  // 1.5 秒后关闭预览
  setTimeout(() => {
    urlCheckResult.value = null;
    activeTab.value = 'subscriptions';
  }, 1500);
};

// 仅保存裸链接（抓取失败时）
const saveLinkOnly = async () => {
  if (!urlCheckResult.value) return;
  await saveToMyLinks();
  urlCheckResult.value.justSaved = true;
  customUrl.value = '';
  await loadUserSubUrls();
  setTimeout(() => {
    urlCheckResult.value = null;
    activeTab.value = 'subscriptions';
  }, 1500);
};

const removeSubscription = async (url) => {
  try {
    await fetch(`${API_BASE}/api/user-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, action: 'remove' }),
    });
    await loadUserSubUrls();
    await loadUserLibrary();  // 同步刷新内容库
  } catch (e) {
    console.error('删除失败:', e);
  }
};

// 将已保存的链接添加到内容库（从"我的链接"列表操作）
const addToLibrary = async (sub) => {
  console.log('addToLibrary 数据:', sub);  // 调试用
  const summaryText = sub.summary || sub.content || '';
  if (!summaryText) return;
  try {
    const res = await fetch(`${API_BASE}/api/articles/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: sub.title || sub.url,
        url: sub.url,
        source: '我的链接',
        summary: summaryText,
        category: sub.category || '未分类',
        importance: 5,
        isUserAdded: true,
        collectedAt: sub.addedAt || new Date().toISOString(),
      }),
    });
    const data = await res.json();
    console.log('添加到内容库结果:', data);  // 调试用
    if (data.success) {
      sub.inLibrary = true;
      await loadUserLibrary();  // 刷新内容库
    }
  } catch (e) {
    console.error('添加到内容库失败:', e);
  }
};

// Daily Report
const loadReport = async () => {
  const dateKey = new Date().toISOString().split('T')[0];
  try {
    const res = await fetch(`${API_BASE}/api/report?date=${dateKey}&t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        dailyReport.value = data.report;
        return;
      }
    }
    // 没有报告 → 自动生成
    await generateReport();
  } catch (e) {
    console.warn('加载报告失败:', e);
  }
};

// 加载今日简报（从 KV 读取 AI 生成的完整简报文本）
const loadBriefing = async () => {
  const dateKey = new Date().toISOString().split('T')[0];
  try {
    const res = await fetch(`${API_BASE}/api/report?date=${dateKey}&t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.report) {
        dailyBriefing.value = data.report.briefing || '';
        dailyScript.value = data.report.script || '';
      }
    }
  } catch (e) {
    console.warn('加载简报失败:', e);
  }
};

// 将简报文本转为 HTML（处理标题、列表、段落）
// 注意：Worker 端已清除 ** 粗体标记，这里只做结构渲染
const formatBriefing = (text) => {
  if (!text) return '';
  // 转义 HTML 特殊字符
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 标题 # ## ### ####
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">$1</h1>');

  // 列表项 - text 或 * text
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300 list-disc list-inside">$1</li>');

  // 分割成段落（按空行分隔）
  const paragraphs = html.split(/\n\n+/);

  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    // 如果已经是块级元素（标题、列表），不包裹 <p>
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li')) return trimmed;
    // 普通段落，内部单换行转为 <br>
    const content = trimmed.replace(/\n/g, '<br>');
    return `<p class="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">${content}</p>`;
  }).join('\n');

  return html;
};

const generateReport = async () => {
  isGeneratingReport.value = true;
  try {
    // 先尝试从后端/Worker 读取（后端每天自动生成）
    const dateKey = new Date().toISOString().split('T')[0];
    const res = await fetch(`${API_BASE}/api/report?date=${dateKey}&t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        dailyReport.value = data.report;
        return;
      }
    }
    // 如果没有，提示用户后端会生成
    dailyReport.value = {
      date: dateKey,
      summary: '今日复盘报告尚未生成，请稍后再试或等待每日自动更新。',
      thinkingAxis: [],
      coreThemes: [],
      questionCount: 0,
      noteCount: 0,
      insight: '后端每天会自动生成复盘报告。',
      tomorrowSuggestion: '',
    };
  } catch (e) {
    console.error('生成报告失败:', e);
  } finally {
    isGeneratingReport.value = false;
  }
};

// --- Timeline & Memory Functions ---
const loadTimeline = async () => {
  const dateKey = new Date().toISOString().split('T')[0];
  try {
    // 加载时间线分析（叙事 + 复盘问题）
    const timelineRes = await fetch(`${R2_BASE_URL}/memory/timeline/${dateKey}.json?t=${Date.now()}`);
    if (timelineRes.ok) {
      timelineAnalysis.value = await timelineRes.json();
      timelineEvents.value = timelineAnalysis.value?.events || [];
    } else {
      timelineAnalysis.value = null;
      timelineEvents.value = [];
    }

    // 加载活跃脉络
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

// 记录用户行为事件（供其他函数调用）
// 注意：这里先直接存到 R2，等 Worker 加了 /api/events 端点后再切换
const recordEvent = async (type, title, options = {}) => {
  const dateKey = new Date().toISOString().split('T')[0];
  const event = {
    id: `evt_${dateKey.replace(/-/g, '')}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    title,
    content: options.content || '',
    refs: {
      articles: options.articles || [],
      threads: options.threads || [],
      notes: options.notes || []
    },
    tags: options.tags || []
  };

  try {
    // 发送到 Worker API
    await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateKey, event })
    });
  } catch (e) {
    // 静默失败，不影响用户体验
    console.debug('记录事件失败:', e);
  }
};

// 事件显示辅助函数
const getEventLabel = (type) => {
  const labels = {
    article_read: '阅读',
    note_created: '笔记',
    note_edit: '编辑笔记',
    question_asked: '提问',
    article_starred: '收藏',
    category_edited: '分类'
  };
  return labels[type] || type;
};

const getEventColor = (type) => {
  const colors = {
    article_read: 'bg-blue-400',
    note_created: 'bg-emerald-400',
    note_edit: 'bg-emerald-300',
    question_asked: 'bg-amber-400',
    article_starred: 'bg-yellow-400',
    category_edited: 'bg-purple-400'
  };
  return colors[type] || 'bg-gray-400';
};

const getEventTextColor = (type) => {
  const colors = {
    article_read: 'text-blue-600 dark:text-blue-400',
    note_created: 'text-emerald-600 dark:text-emerald-400',
    note_edit: 'text-emerald-600 dark:text-emerald-400',
    question_asked: 'text-amber-600 dark:text-amber-400',
    article_starred: 'text-yellow-600 dark:text-yellow-400',
    category_edited: 'text-purple-600 dark:text-purple-400'
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
  const created = new Date(thread.createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000)) + 1;
};

const formatEventTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// --- Lifecycle ---
onMounted(async () => {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark');
  }

  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  displayDateStr.value = formatDate(today);

  try {
    const historyUrl = `${R2_BASE_URL}/data/history.json?t=${Date.now()}`;
    const res = await fetch(historyUrl);
    if (res.ok) {
      const allData = await res.json();
      rawArticles.value = allData.map(a => ({
        ...a,
        collectedAt: a.collectedAt || today.toISOString()
      })).reverse();
    }

    // 加载用户添加到内容库的文章
    try {
      const libRes = await fetch(`${API_BASE}/api/articles?t=${Date.now()}`);
      if (libRes.ok) {
        const libData = await libRes.json();
        if (libData.success && Array.isArray(libData.articles)) {
          // 合并到 rawArticles，避免重复
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
    if (githubRes.ok) {
      githubTrendingData.value = await githubRes.json();
    }

    await Promise.all([loadUserEdits(), loadNotes(), loadUserSubUrls(), loadBriefing()]);
    availableCategories.value = [...new Set([...stats.value.map(s => s.label)])];
  } catch (error) {
    console.error('加载历史数据失败:', error);
  } finally {
    isLoading.value = false;
  }

  const mp3Url = `${R2_BASE_URL}/podcast/${dateKey}.mp3?t=${Date.now()}`;
  audioPlayer = new Audio(mp3Url);
  window.audioPlayer = audioPlayer;
  audioPlayer.addEventListener('ended', () => { isPlaying.value = false; });
  audioPlayer.addEventListener('error', () => { hasAudio.value = false; });
  audioPlayer.addEventListener('canplay', () => { hasAudio.value = true; });
  audioPlayer.volume = 1;
  audioPlayer.muted = false;
  audioPlayer.load();
});

// 从 Worker KV 加载用户添加到内容库的文章
// 策略：完全用 Worker 端数据覆盖本地，保证与后端一致
const loadUserLibrary = async () => {
  try {
    const libRes = await fetch(`${API_BASE}/api/articles?t=${Date.now()}`);
    if (libRes.ok) {
      const libData = await libRes.json();
      if (libData.success && Array.isArray(libData.articles)) {
        // 将用户文章按 url 建立索引
        const userArticlesMap = new Map();
        for (const article of libData.articles) {
          userArticlesMap.set(article.url, { ...article, isUserAdded: true });
        }
        // 更新 rawArticles：保留非用户文章 + 用用户数据覆盖
        const nonUserArticles = rawArticles.value.filter(a => !a.isUserAdded);
        rawArticles.value = [...libData.articles, ...nonUserArticles];
      }
    }
  } catch (e) {
    console.warn('加载用户内容库失败:', e);
  }
};

onUnmounted(() => {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }
});

// --- Computed ---
const todayStr = new Date().toISOString().split('T')[0];
const totalArticles = computed(() => rawArticles.value.filter(a => !a.isGithubTrending).length);
const todayArticlesCount = computed(() =>
  rawArticles.value.filter(a => a.collectedAt?.startsWith(todayStr) && !a.isGithubTrending).length
);

const stats = computed(() => {
  const counts = {};
  rawArticles.value
    .filter(a => !a.isGithubTrending)
    .forEach(article => {
      const cat = userEdits.value[article.url] || article.category;
      counts[cat] = (counts[cat] || 0) + 1;
    });
  return Object.entries(counts).map(([label, count]) => ({
    label, count, icon: getCategoryIcon(label)
  })).sort((a, b) => b.count - a.count);
});

const filteredArticles = computed(() => {
  // 过滤掉 GitHub Trending（只在首页展示）
  let mainArticles = rawArticles.value.filter(article => !article.isGithubTrending);

  // 搜索过滤
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
  if (!rawArticles.value || !Array.isArray(rawArticles.value)) return [];
  // 过滤掉 GitHub Trending，按重要性排序取前 10 篇
  const todayArticles = rawArticles.value
    .filter(a => a.collectedAt?.startsWith(todayStr) && !a.isGithubTrending)
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

// 文章选择器搜索过滤
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

// --- Chat ---
const chatInput = ref('');
const isChatLoading = ref(false);
const chatMessages = ref([
  { role: 'assistant', content: '你好！我是你的 AI 助手。我已经读取了历史知识库情报。可以为你深入分析任何话题，或者回答你感兴趣的问题。' }
]);

// 聊天模型配置（从 localStorage 读取）
const chatModelId = ref(localStorage.getItem('chat_model_id') || 'default');
const customApiKey = ref(localStorage.getItem('chat_custom_key') || '');
const customBaseURL = ref(localStorage.getItem('chat_custom_base') || 'https://api.openai.com/v1');
const customModelName = ref(localStorage.getItem('chat_custom_model') || 'gpt-4o-mini');
const showModelSelector = ref(false);

const selectedModel = computed(() => PRESET_MODELS.find(m => m.id === chatModelId.value) || PRESET_MODELS[0]);

// 保存模型配置到 localStorage
const saveModelConfig = () => {
  localStorage.setItem('chat_model_id', chatModelId.value);
  localStorage.setItem('chat_custom_key', customApiKey.value);
  localStorage.setItem('chat_custom_base', customBaseURL.value);
  localStorage.setItem('chat_custom_model', customModelName.value);
};

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

  // 保存用户提问到 KV
  const dateKey = new Date().toISOString().split('T')[0];
  await fetch(`${API_BASE}/api/chat-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: dateKey, role: 'user', content: userText }),
  }).catch(() => {});

  // 记录事件
  recordEvent('question_asked', userText.slice(0, 50), { content: userText.slice(0, 100) });

  try {
    const messagesToSend = chatMessages.value
      .filter(msg => !msg.content.startsWith('你好！我是你的 AI 助手。'))
      .map(msg => ({ role: msg.role, content: msg.content }));
    const dateKey = new Date().toISOString().split('T')[0];

    let aiReply = '';

    if (selectedModel.value.provider === 'worker') {
      // 使用默认 Worker API
      const response = await fetch(WORKER_CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend, date: dateKey })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      aiReply = data.choices?.[0]?.message?.content || '抱歉，API 没有返回有效内容。';
    } else {
      // 使用自定义 API（OpenAI 兼容格式）
      let apiKey = customApiKey.value.trim();
      let baseURL = customBaseURL.value.trim().replace(/\/$/, '');
      let modelName = customModelName.value.trim();

      // 非自定义模型则用预设值
      if (selectedModel.value.id !== 'custom') {
        baseURL = selectedModel.value.baseURL;
        modelName = selectedModel.value.model;
      }

      if (!apiKey) {
        throw new Error('请先在模型设置中填入 API Key');
      }

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: `你是一个智能助手，正在帮助用户分析今天的资讯简报。今天是 ${dateKey}。请用中文回答。` },
            ...messagesToSend
          ],
          max_tokens: 1000,
          temperature: 0.7
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
</script>
