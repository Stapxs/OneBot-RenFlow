import { reactive } from 'vue'
import { type RunTimeDataElem } from './elements/information'

const baseRuntime = {
    sysConfig: {}
}

export const runtimeData: RunTimeDataElem = reactive(baseRuntime)

// 重置 Runtime，但是保留应用设置之类已经加载好的应用内容
export function resetRuntime(resetAll = false) {
}
