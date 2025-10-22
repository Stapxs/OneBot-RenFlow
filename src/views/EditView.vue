<template>
    <div class="edit-view">
        <h1>Edit View</h1>
        <p>编辑窗口</p>

        <div class="navigation">
            <button @click="closeWindow">关闭窗口</button>
        </div>

        <div class="editor-area">
            <textarea v-model="content" placeholder="在这里编辑内容..." />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { windowManager } from '@app/functions/window'

const content = ref('')

async function closeWindow() {
    await windowManager.closeWindow('edit')
}
</script>

<style scoped>
.edit-view {
    padding: 20px;
}

.navigation {
    margin-bottom: 20px;
}

.navigation button {
    padding: 8px 16px;
    cursor: pointer;
}

.editor-area {
    margin-top: 20px;
}

.editor-area textarea {
    width: 100%;
    min-height: 300px;
    padding: 10px;
    font-family: monospace;
    font-size: 14px;
}
</style>
