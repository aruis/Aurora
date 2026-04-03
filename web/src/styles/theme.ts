import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1d4b8f',
    colorInfo: '#1d4b8f',
    colorSuccess: '#3f7d58',
    colorWarning: '#b7791f',
    colorError: '#b83232',
    colorBgLayout: '#eef3f8',
    colorBgContainer: '#ffffff',
    colorBorderSecondary: '#d5deeb',
    colorBorder: '#d5deeb',
    colorText: '#162033',
    colorTextSecondary: '#5c667a',
    borderRadius: 14,
    borderRadiusLG: 24,
    fontSize: 14,
    fontFamily:
      "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC',system-ui,sans-serif",
    boxShadowSecondary: '0 24px 60px rgba(20, 39, 74, 0.10)',
    controlHeight: 40,
    controlHeightLG: 46,
  },
  components: {
    Layout: {
      bodyBg: 'transparent',
      siderBg: '#0f213f',
      headerBg: 'rgba(247, 249, 252, 0.68)',
      triggerBg: '#17335d',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(255,255,255,0.14)',
      darkItemSelectedColor: '#ffffff',
      darkSubMenuItemBg: 'transparent',
      itemBorderRadius: 14,
      itemColor: 'rgba(255,255,255,0.7)',
      itemHoverColor: '#ffffff',
    },
    Card: {
      headerBg: 'transparent',
      bodyPadding: 24,
    },
    Table: {
      headerBg: '#f4f7fb',
      borderColor: '#dde5f0',
      rowHoverBg: '#f7f9fd',
      headerColor: '#46536a',
      headerSplitColor: '#dde5f0',
    },
    Form: {
      labelColor: '#344054',
    },
    Button: {
      borderRadius: 14,
      primaryShadow: '0 10px 24px rgba(29, 75, 143, 0.22)',
      defaultShadow: 'none',
    },
    Input: {
      activeBorderColor: '#1d4b8f',
      hoverBorderColor: '#5d83b6',
    },
    InputNumber: {
      activeBorderColor: '#1d4b8f',
      hoverBorderColor: '#5d83b6',
    },
    Select: {
      activeBorderColor: '#1d4b8f',
      hoverBorderColor: '#5d83b6',
    },
    Modal: {
      borderRadiusLG: 24,
    },
  },
}
