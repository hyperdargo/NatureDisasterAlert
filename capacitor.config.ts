import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Packaging config for the Android app.
 *
 * `webDir` points at the static export produced by `npm run app:shell`, so the
 * entire interface ships inside the APK and loads from local storage. Only the
 * hazard data crosses the network, fetched from the deployed site, because
 * that data is live and an app carrying a frozen copy would be dangerous.
 *
 * The Android project lives in its own directory so it does not collide with
 * android/, which holds the older Trusted Web Activity wrapper.
 */
const config: CapacitorConfig = {
  appId: "np.com.ankitgupta.disasteralert",
  appName: "Disaster Alert",
  webDir: "android-app-shell",

  android: {
    path: "android-capacitor",
    // The bundled pages are plain files; nothing needs a mixed-content escape.
    allowMixedContent: false,
  },

  server: {
    // Serving from https://localhost rather than a file:// origin gives the
    // WebView a secure context, which geolocation, notifications and the
    // service worker all require. It is also the origin allowed by the API's
    // CORS list; see src/lib/cors.ts.
    androidScheme: "https",
    hostname: "localhost",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#0D0D0D",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
