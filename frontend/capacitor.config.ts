import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flipmemory.app',
  appName: 'FlipMemory',
  webDir: 'dist',
  
  // Android 特定配置
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true, // 开发时可以调试，发布时设为 false
  },
  
  // 插件配置
  plugins: {
    // 状态栏配置
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f97316',
      overlaysWebView: false,
    },
    
    // 启动画面配置
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#fef3e2',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    
    // 键盘配置
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    
    // 本地通知配置
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#f97316',
    },
  },
  
  // 服务器配置 (用于开发调试，生产时应移除或修改)
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
