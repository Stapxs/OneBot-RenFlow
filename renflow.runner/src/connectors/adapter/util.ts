type Mapping = Record<string, string | ((src: any) => any)>

export function mapToClass<T>(src: any, cls: new () => T, mapping: Mapping): T {
  const instance = new cls()
  for (const [key, map] of Object.entries(mapping)) {
    if (typeof map === 'function') {
      (instance as any)[key] = map(src)
    } else {
      (instance as any)[key] = map.split('.').reduce((o, k) => o?.[k], src)
    }
  }
  return instance
}
