// Plataforma B (APK Android, Capacitor). Na PWA tudo isto fica desligado.
import { Capacitor } from '@capacitor/core';

export const eNativo = (): boolean => Capacitor.isNativePlatform();
