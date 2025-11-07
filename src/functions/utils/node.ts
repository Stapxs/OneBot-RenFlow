/**
 * 获取所有附加节点类型
 * @returns 节点类型列表
 */
export function getExNodeTypes(type: string) {
    const modules = import.meta.glob('../../components/nodes/*.vue', { eager: true })
    const nodeTypes: any[] = []
    for (const path in modules) {
        // 获取文件名作为节点类型
        const fileName = path.split('/').pop()
        if (!fileName) continue
        nodeTypes.push(fileName.replace('Node.vue', '').toLowerCase())
    }
    // 如果 nodeTypes 里存在 type 就返回 type，否则返回 base
    if (nodeTypes.includes(type.toLowerCase())) {
        return type.toLowerCase()
    } else {
        return 'base'
    }
}
