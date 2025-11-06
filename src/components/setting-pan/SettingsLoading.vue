<script setup>
</script>
<template>
    <div class="settings-loading">
        <font-awesome-icon spin :icon="['fas', 'fa-spinner']" />
    </div>
</template>
<style scoped>
.settings-loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-radius: 7px;
    height: 40vh;
    width: 100%
}
.settings-loading > svg {
    color: var(--color-font-2);
    height: 2rem;
    width: 2rem;
}
</style>
