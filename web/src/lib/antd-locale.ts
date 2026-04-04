import zhCNModule from 'antd/locale/zh_CN'

type MaybeDefault<T> = T & { default?: T }

export const antdZhCN = (zhCNModule as MaybeDefault<typeof zhCNModule>).default ?? zhCNModule
