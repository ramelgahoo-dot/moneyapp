import type { CapacitorConfig } from '@capacitor/cli';

const serverUrlBase = process.env.CAPACITOR_SERVER_URL || 'https://moneyapp-snowy.vercel.app'
const cacheBuster = process.env.CAPACITOR_CACHE_BUSTER || String(Date.now())
const serverUrl = `${serverUrlBase}${serverUrlBase.includes('?') ? '&' : '?'}v=${cacheBuster}`
const useRemoteServer = process.env.CAPACITOR_USE_REMOTE_SERVER !== '0'

const config: CapacitorConfig = {
  appId: 'com.moneyapp.mobile',
  appName: 'MoneyApp',
  webDir: 'www',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
  },
  server: {
    ...(useRemoteServer ? { url: serverUrl } : {}),
    cleartext: process.env.CAPACITOR_CLEAR_TEXT === '1' ? true : false,
    androidScheme: process.env.CAPACITOR_ANDROID_SCHEME || 'https',
    allowNavigation: [
      'http://localhost',
      'https://localhost',
      'https://moneyapp-snowy.vercel.app',
      'https://www.moneyapp-snowy.vercel.app',
      'https://*.vercel.app',
      'https://*.supabase.co',
      'https://js.stripe.com',
      'https://checkout.stripe.com',
      'https://*.stripe.com',
      '*',
    ],
  },
};

export default config;
