// Mock permission service for frontend demo
// In production, this would make API calls to handle permissions

import { Alert, Linking } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  message: string;
  requiresSettings?: boolean;
}

export class PermissionServiceMock {
  private static instance: PermissionServiceMock;

  private constructor() {}

  static getInstance(): PermissionServiceMock {
    if (!PermissionServiceMock.instance) {
      PermissionServiceMock.instance = new PermissionServiceMock();
    }
    return PermissionServiceMock.instance;
  }

  // Mock camera permission request
  async requestCameraPermission(showExplanations: boolean = true): Promise<PermissionResult> {
    if (showExplanations) {
      return new Promise((resolve) => {
        Alert.alert(
          '📸 Camera Access',
          'SnapSecure needs camera access to capture photos and videos for your snaps.\n\n🔒 All photos are encrypted and stored securely with blockchain verification.',
          [
            {
              text: 'Grant Access',
              onPress: () => resolve({
                granted: true,
                canAskAgain: true,
                message: 'Camera permission granted'
              })
            },
            {
              text: 'Deny',
              style: 'cancel',
              onPress: () => resolve({
                granted: false,
                canAskAgain: true,
                message: 'Camera permission denied'
              })
            }
          ]
        );
      });
    }

    // Auto-grant for demo
    return {
      granted: true,
      canAskAgain: true,
      message: 'Camera permission granted (mock)'
    };
  }

  // Mock microphone permission request
  async requestMicrophonePermission(showExplanations: boolean = true): Promise<PermissionResult> {
    if (showExplanations) {
      return new Promise((resolve) => {
        Alert.alert(
          '🎤 Microphone Access',
          'Microphone access is needed to record audio for your video snaps.\n\n🔒 Audio is encrypted and protected with the same security as your videos.',
          [
            {
              text: 'Grant Access',
              onPress: () => resolve({
                granted: true,
                canAskAgain: true,
                message: 'Microphone permission granted'
              })
            },
            {
              text: 'Deny',
              style: 'cancel',
              onPress: () => resolve({
                granted: false,
                canAskAgain: true,
                message: 'Microphone permission denied'
              })
            }
          ]
        );
      });
    }

    // Auto-grant for demo
    return {
      granted: true,
      canAskAgain: true,
      message: 'Microphone permission granted (mock)'
    };
  }

  // Mock gallery permission request
  async requestGalleryPermission(showExplanations: boolean = true): Promise<PermissionResult> {
    if (showExplanations) {
      return new Promise((resolve) => {
        Alert.alert(
          '🖼️ Photo Gallery Access',
          'Gallery access allows you to select existing photos and videos to share as snaps.\n\n🔒 Your gallery access is secure and protected.',
          [
            {
              text: 'Grant Access',
              onPress: () => resolve({
                granted: true,
                canAskAgain: true,
                message: 'Gallery permission granted'
              })
            },
            {
              text: 'Deny',
              style: 'cancel',
              onPress: () => resolve({
                granted: false,
                canAskAgain: true,
                message: 'Gallery permission denied'
              })
            }
          ]
        );
      });
    }

    // Auto-grant for demo
    return {
      granted: true,
      canAskAgain: true,
      message: 'Gallery permission granted (mock)'
    };
  }

  // Mock get all permission statuses
  async getAllPermissionStatuses(): Promise<any> {
    return {
      camera: { granted: true, canAskAgain: true },
      microphone: { granted: true, canAskAgain: true },
      gallery: { granted: true, canAskAgain: true }
    };
  }

  // Mock open app settings
  async openAppSettings(): Promise<void> {
    Alert.alert(
      'Open Settings',
      'Please open your device settings and enable camera permissions for SnapSecure.',
      [
        { text: 'OK' }
      ]
    );
  }

  // Mock show permission denied help
  async showPermissionDeniedHelp(permissionType: string): Promise<void> {
    Alert.alert(
      'Permission Required',
      `${permissionType} permission is required for this feature. Please enable it in your device settings.`,
      [
        { text: 'OK' }
      ]
    );
  }
}

export const permissionService = PermissionServiceMock.getInstance();