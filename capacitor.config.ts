import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nodaw.suite',
  appName: 'NoDAW',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
};

export default config;
