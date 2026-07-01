module.exports = {
  expo: {
    name: 'PhasePlate',
    slug: 'PhasePlate',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'com.coulascreations.phaseplate',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.coulascreations.phaseplate',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        BGTaskSchedulerPermittedIdentifiers: ['com.coulascreations.phaseplate.background-fetch'],
        NSCameraUsageDescription: 'PhasePlate uses your camera to photograph meals for nutritional analysis.',
        NSPhotoLibraryUsageDescription: 'PhasePlate accesses your photo library to log meals.',
        NSHealthShareUsageDescription: 'PhasePlate reads your health data to display steps, calories, and heart rate.',
        NSHealthUpdateUsageDescription: 'PhasePlate writes cycle tracking data to Apple Health.',
        UIBackgroundModes: ['fetch'],
      },
      entitlements: {
        'com.apple.developer.healthkit': true,
        'com.apple.developer.healthkit.access': [],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.coulascreations.phaseplate',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'com.coulascreations.phaseplate' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
        'android.permission.POST_NOTIFICATIONS',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: 'PhasePlate accesses photos to log meals.',
          cameraPermission: 'PhasePlate uses your camera to photograph meals for nutritional analysis.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'PhasePlate uses your camera to scan barcodes and photograph meals.',
        },
      ],
      [
        'react-native-health',
        {
          isClinicalDataEnabled: false,
          NSHealthShareUsageDescription: 'PhasePlate reads health data to display activity and wellness insights.',
          NSHealthUpdateUsageDescription: 'PhasePlate writes cycle data to Apple Health.',
          permissions: {
            read: ['StepCount', 'ActiveEnergyBurned', 'RestingHeartRate', 'HeartRate', 'Workout'],
            write: [],
          },
        },
      ],
      'expo-task-manager',
      'expo-background-fetch',
    ],
    extra: {
      eas: {
        projectId: '1e07d8b0-4186-4fa1-8747-4b50d0b536c4',
      },
    },
    owner: 'iancoulas',
  },
};
