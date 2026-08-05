<template>
  <main class="h-full flex flex-col max-w-4xl mx-auto">
    <!-- Header -->
    <div class="py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
      <div class="flex items-center justify-between px-6">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Knowledge Retrieval Chat</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">基于今日情报的智能问答</p>
        </div>
        <button
          @click="$emit('toggle-selector')"
          class="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-colors"
          :class="selectedModel.id !== 'default' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222]'"
        >
          <Cpu :size="14" />{{ selectedModel.name }}
          <ChevronDown :size="12" class="transition-transform" :class="{ 'rotate-180': showSelector }" />
        </button>
      </div>

      <!-- Model Selector -->
      <div v-if="showSelector" class="mx-6 mt-3 p-4 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-gray-700">
        <div class="mb-3">
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">选择模型</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="model in presetModels"
              :key="model.id"
              @click="$emit('select-model', model.id)"
              class="px-3 py-2 text-xs rounded-lg border text-left transition-all"
              :class="selectedModel.id === model.id ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white border-[#2D3A5F] dark:border-[#3D4F7C]' : 'bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'"
            >{{ model.name }}</button>
          </div>
        </div>
        <div v-if="selectedModel.provider === 'custom'" class="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div v-for="field in [
            { key: 'customBaseURL', label: 'Base URL', modelKey: 'custom-base-u-r-l' },
            { key: 'customModelName', label: 'Model Name', modelKey: 'custom-model-name' },
            { key: 'customApiKey', label: 'API Key', modelKey: 'custom-api-key', type: 'password' }
          ]" :key="field.key">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{{ field.label }}</label>
            <input
              :value="field.key === 'customBaseURL' ? customBaseURL : field.key === 'customModelName' ? customModelName : customApiKey"
              @change="$emit(`update:${field.modelKey}`, $event.target.value)"
              :type="field.type || 'text'"
              :placeholder="field.key === 'customBaseURL' ? 'https://api.openai.com/v1' : field.key === 'customModelName' ? 'gpt-4o-mini' : 'sk-...'"
              class="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 dark:text-gray-200"
            />
          </div>
        </div>
        <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-2">💡 配置保存在浏览器本地</p>
      </div>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6" ref="messagesRef">
      <div v-for="(msg, idx) in messages" :key="idx" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
        <div v-if="msg.role === 'assistant'" class="w-8 h-8 rounded-full bg-[#2D3A5F] dark:bg-[#3D4F7C] flex items-center justify-center mr-3 flex-shrink-0 text-white mt-1 shadow-sm"><Bot :size="16" /></div>
        <div
          class="max-w-[80%] px-5 py-3.5 text-[14px] leading-relaxed shadow-sm"
          :class="msg.role === 'user' ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white rounded-2xl rounded-tr-sm' : 'bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm whitespace-pre-wrap'"
        >{{ msg.content }}</div>
      </div>
    </div>

    <!-- Input -->
    <div class="p-6 bg-white/50 dark:bg-[#161616]/50 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
      <div class="relative flex items-center">
        <input
          :value="input"
          @input="$emit('update:input', $event.target.value)"
          @keydown.enter="$emit('send')"
          type="text"
          placeholder="询问关于今日简报的细节... (Enter 发送)"
          class="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-5 py-3.5 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-300 transition-all shadow-sm text-sm"
        />
        <button
          @click="$emit('send')"
          :disabled="!input.trim() || isLoading"
          class="absolute right-2 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          :class="input.trim() ? 'bg-[#2D3A5F] dark:bg-[#3D4F7C] text-white hover:bg-[#1f2844] shadow-sm' : 'bg-gray-100 dark:bg-[#222] text-gray-400 dark:text-gray-600 cursor-not-allowed'"
        >
          <Send v-if="!isLoading" :size="16" class="ml-0.5" />
          <Loader2 v-else :size="16" class="animate-spin" />
        </button>
      </div>
      <div class="text-center mt-3 text-[11px] text-gray-400 dark:text-gray-500">💡 云端 AI 将基于你的历史数据库为你深度解答。</div>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { Cpu, ChevronDown, Bot, Send, Loader2 } from 'lucide-vue-next';

const messagesRef = ref(null);

defineProps({
  messages: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  input: { type: String, default: '' },
  selectedModel: { type: Object, default: () => ({}) },
  presetModels: { type: Array, default: () => [] },
  showSelector: { type: Boolean, default: false },
  customBaseURL: { type: String, default: '' },
  customModelName: { type: String, default: '' },
  customApiKey: { type: String, default: '' },
});

defineEmits([
  'update:input', 'send', 'toggle-selector', 'select-model',
  'update:custom-base-u-r-l', 'update:custom-model-name', 'update:custom-api-key'
]);
</script>
