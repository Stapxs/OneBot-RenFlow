<script setup lang="ts">
import Option from '@app/functions/option'

import { onMounted } from 'vue';
import { backend } from '@app/functions/backend'
import { Logger } from '@app/functions/base'

const dev = import.meta.env.DEV

function handleAppbarMouseDown(e: MouseEvent) {
    // 获取 URL 最后一级路径作为窗口标识
    const winId = location.pathname.split('/').pop()
    backend.call('win:StartDragging', winId)
}

function barMainClick() {
    // handle main bar click (placeholder)
}

function controllWin(action: 'minimize' | 'close') {
    // handle window control actions (placeholder)
}

onMounted(async () => {
    const logger = new Logger()
    window.moYu = () => { return '\x75\x6e\x64\x65\x66\x69\x6e\x65\x64' }

    await backend.init()
    // runtimeData.sysConfig = await Option.load()
});
</script>

<template>
    <div class="app-container">
        <!-- Windows/Linux 自定义标题栏 -->
        <div v-if="['linux', 'win32'].includes(backend.platform ?? '')"
            :class="'top-bar' + ((backend.platform == 'win32' && dev) ? ' win' : '')"
            name="appbar"
            data-tauri-drag-region="true"
            @mousedown="handleAppbarMouseDown">
            <div class="bar-button" @click="barMainClick()" />
            <div class="space" />
            <div class="controller">
                <div class="min" @click="controllWin('minimize')">
                    <font-awesome-icon :icon="['fas', 'minus']" />
                </div>
                <div class="close" @click="controllWin('close')">
                    <font-awesome-icon :icon="['fas', 'xmark']" />
                </div>
            </div>
        </div>

        <!-- macOS 拖拽区域 -->
        <div v-if="backend.platform == 'darwin'"
            class="controller mac-controller"
            data-tauri-drag-region="true" />

        <!-- 路由视图 -->
        <router-view />
    </div>
</template>
