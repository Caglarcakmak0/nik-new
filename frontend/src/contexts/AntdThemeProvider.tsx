import React, { useMemo } from "react";
import { ConfigProvider, theme, App as AntdApp } from "antd";
import trTR from "antd/locale/tr_TR";
import { useTheme } from "./ThemeContext";
import { useDesign } from "./DesignContext";

export const AntdThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isDark } = useTheme();
  const { designMode } = useDesign();

  const antdTheme = useMemo(() => {
    const base: any = {
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: "#1677ff",
        borderRadius: 12,
        fontFamily: 'var(--font-ui)',
      },
      components: {
        Layout: {
          headerBg: isDark ? "#1f1f1f" : "#fff",
          bodyBg: isDark ? "#0f1419" : "#ffffff",
          colorBgContainer: isDark ? "#1f1f1f" : "#fff",
        },
        Menu: {
          colorBgContainer: isDark ? "#1f1f1f" : "#fff",
          itemColor: isDark ? "rgba(255, 255, 255, 0.75)" : "rgba(0, 0, 0, 0.88)",
          itemSelectedColor: isDark ? "#40a9ff" : "#1677ff",
          itemHoverColor: isDark
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(0, 0, 0, 0.75)",
          itemSelectedBg: isDark ? "rgba(64, 169, 255, 0.2)" : "#e6f7ff",
        },
        Card: {
          colorBgContainer: isDark ? "#1f1f1f" : "#fff",
        },
        Button: {
          colorBgTextHover: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.06)",
          colorBgTextActive: isDark
            ? "rgba(255, 255, 255, 0.15)"
            : "rgba(0, 0, 0, 0.15)",
          fontWeight: 600,
          contentFontSize: 15,
          controlHeight: 35,
          borderRadius: 9,
        },
        Input: {
          borderRadius: 9,
        },
        Select: {
          borderRadius: 9,
        },
        DatePicker: {
          borderRadius: 9,
        },
        InputNumber: {
          borderRadius: 9,
        },
      } as any,
    };

    if (designMode === 'soft') {
      base.token.colorPrimary = '#3b82f6';
      base.token.borderRadius = 12;
      base.components.Layout.headerBg = isDark ? '#1b1f26' : '#ffffff';
      base.components.Layout.bodyBg = isDark ? '#0f1419' : '#f3f6fb';
      base.components.Card.colorBgContainer = isDark ? '#1b1f26' : '#ffffff';
      base.components.Menu.itemSelectedBg = isDark ? 'rgba(59, 130, 246, 0.2)' : '#edf5ff';
      base.components.Button.borderRadius = 9;
      base.components.Input = { ...(base.components.Input || {}), borderRadius: 9 };
      return base;
    }

    if (designMode === 'neon') {
      base.token.colorPrimary = '#f97316';
      base.token.borderRadius = 12;
      base.components.Layout.headerBg = 'transparent';
      base.components.Layout.bodyBg = isDark ? '#05010a' : '#f3f6fb';
      base.components.Card.colorBgContainer = isDark ? 'rgba(11, 18, 32, 0.6)' : '#ffffff';
      base.components.Button.borderRadius = 9;
      base.components.Input = { ...(base.components.Input || {}), borderRadius: 9 };
      base.components.Menu.itemSelectedBg = isDark ? 'rgba(249, 115, 22, 0.18)' : 'rgba(249, 115, 22, 0.10)';
      return base;
    }

    return base;
  }, [designMode, isDark]);

  return (
    <ConfigProvider locale={trTR} theme={antdTheme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
};


