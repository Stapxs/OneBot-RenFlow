type SourceMappingRule =
  | string // 简单路径，例如 "info.userName"
  | ((src: any) => any) // 自定义取值函数
  | {
      path: string | ((src: any) => any)
      transform?: (value: any) => any
      itemMap?: Mapping // 支持数组元素映射
    }

export type Mapping = Record<string, SourceMappingRule>

/** 工具函数：按路径取值，如 "a.b.c" */
function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

/** 工具函数：按路径设置值，如 "a.b.c" = value */
function setByPath(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const last = keys.pop()!
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {}
    return acc[key]
  }, obj)
  target[last] = value
}

/**
 * 将任意 JSON 数据映射到 interface 结构
 * @param src 源数据
 * @param mapping 映射规则
 * @returns interface 对象
 */
export function mapToInterface<T>(src: any, mapping: Mapping): T {
  const result: any = {}

  for (const [targetPath, srcRule] of Object.entries(mapping)) {
    let rawValue: any

    if (typeof srcRule === 'function') {
      // 函数映射
      rawValue = srcRule(src)
    } else if (typeof srcRule === 'string') {
      // 简单路径
      rawValue = getByPath(src, srcRule)
    } else {
      // 对象配置
      const val =
        typeof srcRule.path === 'function' ? srcRule.path(src) : getByPath(src, srcRule.path)

      rawValue = srcRule.transform ? srcRule.transform(val) : val

      // 如果是数组，递归处理子项
      if (srcRule.itemMap && Array.isArray(rawValue)) {
        rawValue = rawValue.map((item) =>
          mapToInterface(item, srcRule.itemMap!)
        )
      }
    }

    setByPath(result, targetPath, rawValue)
  }

  return result as T
}
