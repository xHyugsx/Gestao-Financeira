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
    // A app já usa viewport-fit=cover e env(safe-area-inset-*): o fundo do tema fica por trás das barras.
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'DARK' },
    // FLAG_SECURE: o ecrã não aparece nos recentes nem em capturas.
    PrivacyScreen: { enable: true },
    LocalNotifications: { smallIcon: 'ic_stat_financas', iconColor: '#A855F7' },
  },
};

export default config;
