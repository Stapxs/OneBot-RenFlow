<template>
    <div class="settings-view">
        <BcScrolltab title="组件列表">
            <h2 icon="fa-solid fa-expand">卡片1</h2>
            <ss-card><p>你好世界！</p></ss-card>
            <h2>卡片2</h2>
            <ss-card><p>你好世界！</p></ss-card>
        </BcScrolltab>
    </div>
</template>

<script setup lang="ts">
import BcScrolltab from 'vue3-bcui/packages/bc-scrolltab'
</script>

<style scoped>
</style>
