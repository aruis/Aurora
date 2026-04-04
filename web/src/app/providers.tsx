import type { PropsWithChildren } from 'react'

import { App as AntApp, ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'

import { antdZhCN } from '@/lib/antd-locale'
import { queryClient } from '@/lib/query-client'
import { appTheme } from '@/styles/theme'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider locale={antdZhCN} theme={appTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
