<template>
    <transition name="modal">
        <div v-if="state.visible" class="modal-overlay">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>{{ state.title || '确认' }}</h3>
                    <button class="modal-close" @click="cancel">
                        <font-awesome-icon :icon="['fas', 'times']" />
                    </button>
                </div>
                <div class="modal-body">
                    <p v-html="state.message" />
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-cancel" @click="cancel">{{ state.cancelText }}</button>
                    <button class="modal-btn modal-btn-confirm" @click="confirm">{{ state.confirmText }}</button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { confirmState, resolveConfirm } from '@app/functions/confirm'

const state = confirmState

function confirm() {
    resolveConfirm(true)
}

function cancel() {
    resolveConfirm(false)
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: rgba(var(--color-card-rgb), 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.modal-dialog {
    width: 420px;
    background: rgba(var(--color-card-rgb), 0.5);
    backdrop-filter: blur(20px);
    color: var(--color-font);
    border-radius: 10px;
    box-shadow: 0 0 5px var(--color-shader);
    overflow: hidden;
    padding: 10px;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 20px 15px 20px;
    border-bottom: 1px solid var(--color-card-2);
    gap: 12px;
}
.modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-font);
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
}

.modal-body {
    font-size: 0.9rem;
    padding: 16px
}

.modal-footer {
    background: rgba(var(--color-card-1-rgb), 0.5);
    border-radius: 0 0 7px 7px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 15px 20px;
    margin: 0 -10px -10px -10px;
}

.modal-btn {
    padding: 6px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    font-weight: 500;
}

.modal-btn-cancel {
    background: var(--color-card-1);
    color: var(--color-font-2)
}

.modal-btn-confirm {
    background: var(--color-main);
    color: var(--color-font-r)
}

.modal-close {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px
}

.modal-enter-active {
    transition: opacity 0.2s ease-out;
}

.modal-leave-active {
    transition: opacity 0.2s ease-in;
}

.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-dialog {
    animation: panelSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-leave-active .modal-dialog {
    animation: panelSlideDown 0.2s cubic-bezier(0.4, 0, 0.6, 1);
}

@keyframes panelSlideUp {
    from {
        transform: translateY(30px) scale(0.95);
        opacity: 0;
    }

    to {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

@keyframes panelSlideDown {
    from {
        transform: translateY(0) scale(1);
        opacity: 1;
    }

    to {
        transform: translateY(20px) scale(0.98);
        opacity: 0;
    }
}
</style>
