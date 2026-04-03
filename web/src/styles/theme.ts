import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1d3d70',
    colorInfo: '#1d3d70',
    colorSuccess: '#3f7d58',
    colorWarning: '#b7791f',
    colorError: '#b83232',
    colorBgLayout: '#eef2f7',
    colorBgContainer: '#fbfcfe',
    colorBorderSecondary: '#d8e0ec',
    colorText: '#1b2738',
    colorTextSecondary: '#5b6678',
    borderRadius: 14,
    borderRadiusLG: 20,
    fontSize: 14,
    fontFamily:
      "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC',system-ui,sans-serif",
    boxShadowSecondary: '0 14px 34px rgba(18, 38, 63, 0.08)',
  },
  components: {
    Layout: {
      bodyBg: '#eef2f7',
      siderBg: '#14213d',
      headerBg: 'rgba(251, 252, 254, 0.82)',
      triggerBg: '#1b2d4f',
    },
    Menu: {
      darkItemBg: '#14213d',
      darkItemSelectedBg: 'rgba(255,255,255,0.14)',
      darkItemSelectedColor: '#ffffff',
      darkSubMenuItemBg: '#14213d',
      itemBorderRadius: 12,
    },
    Card: {
      headerBg: 'transparent',
    },
    Table: {
      headerBg: '#f3f6fb',
      borderColor: '#dde5f0',
      rowHoverBg: '#f7f9fd',
    },
    Form: {
      labelColor: '#344054',
    },
  },
}
