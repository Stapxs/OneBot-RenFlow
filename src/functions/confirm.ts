import { reactive } from 'vue'

export interface ConfirmOptions {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
}

type Resolver = (value: boolean) => void

export const confirmState = reactive({
    visible: false,
    title: '',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    _resolver: null as Resolver | null,
})

export function confirm(options: ConfirmOptions): Promise<boolean> {
    confirmState.title = options.title || ''
    confirmState.message = options.message
    confirmState.confirmText = options.confirmText || '确认'
    confirmState.cancelText = options.cancelText || '取消'
    confirmState.visible = true

    return new Promise<boolean>((resolve) => {
        confirmState._resolver = (v: boolean) => {
            resolve(v)
        }
    })
}

export function resolveConfirm(value: boolean) {
    try {
        if (confirmState._resolver) confirmState._resolver(value)
    } finally {
        confirmState.visible = false
        confirmState._resolver = null
    }
}

export default confirm
