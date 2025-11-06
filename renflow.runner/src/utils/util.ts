/**
 * 根据路径从 Object 中获取值
 * @param val 一个对象
 * @param path 形似 'a.b.c' 的路径字符串
 * @returns 路径对应的值，如果不存在则返回 undefined
 */
export function getValue(val: Object, path: string): any {
    const parts = path.split('.')
    let current: any = val

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part]
        } else {
            return undefined
        }
    }

    return current
}

/**
 * 判断数组 b 是否为数组 a 的开头部分
 * @param a 数组 a
 * @param b 数组 b
 * @returns 如果 b 是 a 的开头部分则返回 true，否则返回 false
 */
export function startsWithArray(a: string[], b: string[]) {
  if (b.length > a.length) return false;
  return b.every((v, i) => a[i] === v);
}
