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
