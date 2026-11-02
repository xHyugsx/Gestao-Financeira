import type { CapacitorConfig } from '@capacitor/cli';

// Plataforma B (APK Android). A PWA no GitHub Pages não usa este ficheiro.
const config: CapacitorConfig = {
  appId: 'io.github.xhyugsx.financas',
  appName: 'Finanças',
  webDir: '_site',
  backgroundColor: '#05091F',
  android: { allowMixedContent: false, captureInput: false, webContentsDebuggingEnabled: false },
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: '#05091F', showSpinner: false, launchFadeOutDuration: 200 },
    StatusBar: { backgroundColor: '#05091F', style: 'DARK', overlaysWebView: false },
  },
};

export default config;
