<template>
    <div class="list-view">
        <h1>List View</h1>
        <p>主窗口 - 列表视图</p>

        <div class="navigation">
            <button @click="openEditWindow">打开编辑窗口</button>
            <button @click="openSettingsWindow">打开设置窗口</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { windowManager } from '@app/functions/window'

async function openEditWindow() {
    await windowManager.openEditWindow()
}

async function openSettingsWindow() {
    await windowManager.openSettingsWindow()
}
</script>

<style scoped>
.list-view {
    padding: 20px;
}

.navigation {
    margin-top: 20px;
}

.navigation button {
    margin-right: 10px;
    padding: 8px 16px;
    cursor: pointer;
}
</style>
