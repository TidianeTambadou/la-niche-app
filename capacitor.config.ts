import type { CapacitorConfig } from "@capacitor/cli";

// En production, l'app charge l'URL Vercel déployée.
// Pour le dev local, remplace server.url par "http://localhost:3000"
// et assure-toi que ton Mac est sur le même réseau que ton iPhone/simulateur.

const config: CapacitorConfig = {
  appId: "com.laniche.app",
  appName: "La Niche",
  webDir: "out",
  server: {
    // URL de production — à mettre à jour après le premier déploiement Vercel
    url: process.env.CAPACITOR_DEV === "1"
      ? "http://localhost:3000"
      : "https://la-niche-app.vercel.app",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0a0a0a",
      overlaysWebView: false,
    },
    Camera: {
      // L'app demande la permission caméra pour le scan de code-barres
    },
  },
};

export default config;
