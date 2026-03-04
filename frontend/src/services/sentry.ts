import * as Sentry from "@sentry/vue";

/**
 * Sentry 错误追踪初始化
 * 捕获运行时异常并监控性能
 */
export function initSentry(app: any, router: any) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn || import.meta.env.DEV) {
    console.log("[Sentry] Skipping initialization in dev mode or missing DSN");
    return;
  }

  Sentry.init({
    app,
    dsn,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration(),
    ],
    // 性能监控采样率
    tracesSampleRate: 1.0,
    // 会话重放采样率
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // 过滤掉本地开发错误
    environment: import.meta.env.MODE,
  });
  
  console.log("[Sentry] Initialized successfully");
}
