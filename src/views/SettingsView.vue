<template>
    <div class="settings-view">
        <h1>Settings View</h1>
        <p>设置窗口</p>

        <div class="navigation">
            <button @click="closeWindow">
                关闭窗口
            </button>
        </div>

        <div class="settings-content">
            <div class="setting-item">
                <label>日志等级：</label>
                <select v-model="logLevel">
                    <option value="err">错误</option>
                    <option value="info">信息</option>
                    <option value="debug">调试</option>
                    <option value="all">全部</option>
                </select>
            </div>

            <div class="setting-item">
                <label>主题：</label>
                <select v-model="theme">
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="auto">自动</option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { windowManager } from '@app/functions/window'

const logLevel = ref('info')
const theme = ref('auto')

async function closeWindow() {
    await windowManager.closeWindow('settings')
}
</script>

<style scoped>
.settings-view {
    padding: 20px;
}

.navigation {
    margin-bottom: 20px;
}

.navigation button {
    padding: 8px 16px;
    cursor: pointer;
}

.settings-content {
    margin-top: 20px;
}

.setting-item {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
}

.setting-item label {
    width: 100px;
    font-weight: bold;
}

.setting-item select {
    padding: 5px 10px;
    font-size: 14px;
}
</style>
