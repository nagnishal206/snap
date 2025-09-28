import * as MediaLibrary from 'expo-media-library';
import * as Camera from 'expo-camera';
import { Audio } from 'expo-av';
import { Alert, Linking, Platform } from 'react-native';
import { authService } from './authService';
import { blockchainService } from './blockchainService';

export interface PermissionRequest {
  type: 'CAMERA' | 'MICROPHONE' | 'GALLERY';
  reason: string;
  features: string[];
}

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  message: string;
  requiresSettings?: boolean;
}

export class PermissionService {
  private static instance: PermissionService;

  private constructor() {}

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  // Permission explanations for users
  private getPermissionExplanation(type: 'CAMERA' | 'MICROPHONE' | 'GALLERY'): {
    title: string;
    description: string;
    features: string[];
    security: string;
  } {
    switch (type) {
      case 'CAMERA':
        return {
          title: 'Camera Access',
          description: 'SnapSecure needs camera access to capture photos and videos for your snaps',
          features: [
            '📸 Take instant photos',
            '🎥 Record short videos',
            '🔄 Switch between front and back cameras',
            '✨ Apply real-time filters'
          ],
          security: '🔒 All photos are encrypted and stored securely on your device with blockchain verification'
        };
      
      case 'MICROPHONE':
        return {
          title: 'Microphone Access',
          description: 'Microphone access is needed to record audio for your video snaps',
          features: [
            '🎤 Record audio with videos',
            '🔊 High-quality sound capture',
            '🎵 Voice messages',
            '📹 Complete video snap experience'
          ],
          security: '🔒 Audio is encrypted and protected with the same security as your videos'
        };
      
      case 'GALLERY':
        return {
          title: 'Photo Gallery Access',
          description: 'Gallery access allows you to select existing photos and videos to share as snaps',
          features: [
            '🖼️ Choose from existing photos',
            '📱 Select videos from your gallery',
            '📤 Share your favorite memories',
            '✂️ Edit and enhance before sharing'
          ],
          security: '🔒 We only access files you specifically choose - your privacy is protected'
        };
    }
  }

  // Request camera permission with explanation
  async requestCameraPermission(showExplanation: boolean = true): Promise<PermissionResult> {
    try {
      if (showExplanation) {
        const explanation = this.getPermissionExplanation('CAMERA');
        const userAccepted = await this.showPermissionExplanation(explanation);
        if (!userAccepted) {
          return {
            granted: false,
            canAskAgain: true,
            message: 'Camera permission is required to take photos and videos'
          };
        }
      }

      // Check current status
      const { status: currentStatus } = await Camera.getCameraPermissionsAsync();
      
      if (currentStatus === 'granted') {
        await this.recordPermissionGrant('CAMERA', 'Already granted');
        return {
          granted: true,
          canAskAgain: false,
          message: 'Camera access granted'
        };
      }

      // Request permission
      const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        await this.recordPermissionGrant('CAMERA', 'User granted camera access');
        return {
          granted: true,
          canAskAgain: false,
          message: 'Camera access granted successfully'
        };
      }

      if (!canAskAgain) {
        return {
          granted: false,
          canAskAgain: false,
          message: 'Camera permission denied. Please enable in Settings.',
          requiresSettings: true
        };
      }

      return {
        granted: false,
        canAskAgain: true,
        message: 'Camera permission denied'
      };

    } catch (error) {
      console.error('Camera permission request failed:', error);
      return {
        granted: false,
        canAskAgain: true,
        message: 'Failed to request camera permission'
      };
    }
  }

  // Request microphone permission with explanation
  async requestMicrophonePermission(showExplanation: boolean = true): Promise<PermissionResult> {
    try {
      if (showExplanation) {
        const explanation = this.getPermissionExplanation('MICROPHONE');
        const userAccepted = await this.showPermissionExplanation(explanation);
        if (!userAccepted) {
          return {
            granted: false,
            canAskAgain: true,
            message: 'Microphone permission is required to record video with audio'
          };
        }
      }

      // Check current status
      const { status: currentStatus } = await Audio.getPermissionsAsync();
      
      if (currentStatus === 'granted') {
        await this.recordPermissionGrant('MICROPHONE', 'Already granted');
        return {
          granted: true,
          canAskAgain: false,
          message: 'Microphone access granted'
        };
      }

      // Request permission
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();
      
      if (status === 'granted') {
        await this.recordPermissionGrant('MICROPHONE', 'User granted microphone access');
        return {
          granted: true,
          canAskAgain: false,
          message: 'Microphone access granted successfully'
        };
      }

      if (!canAskAgain) {
        return {
          granted: false,
          canAskAgain: false,
          message: 'Microphone permission denied. Please enable in Settings.',
          requiresSettings: true
        };
      }

      return {
        granted: false,
        canAskAgain: true,
        message: 'Microphone permission denied'
      };

    } catch (error) {
      console.error('Microphone permission request failed:', error);
      return {
        granted: false,
        canAskAgain: true,
        message: 'Failed to request microphone permission'
      };
    }
  }

  // Request gallery permission with explanation
  async requestGalleryPermission(showExplanation: boolean = true): Promise<PermissionResult> {
    try {
      if (showExplanation) {
        const explanation = this.getPermissionExplanation('GALLERY');
        const userAccepted = await this.showPermissionExplanation(explanation);
        if (!userAccepted) {
          return {
            granted: false,
            canAskAgain: true,
            message: 'Gallery permission is required to select photos and videos'
          };
        }
      }

      // Check current status
      const { status: currentStatus } = await MediaLibrary.getPermissionsAsync();
      
      if (currentStatus === 'granted') {
        await this.recordPermissionGrant('GALLERY', 'Already granted');
        return {
          granted: true,
          canAskAgain: false,
          message: 'Gallery access granted'
        };
      }

      // Request permission
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        await this.recordPermissionGrant('GALLERY', 'User granted gallery access');
        return {
          granted: true,
          canAskAgain: false,
          message: 'Gallery access granted successfully'
        };
      }

      if (!canAskAgain) {
        return {
          granted: false,
          canAskAgain: false,
          message: 'Gallery permission denied. Please enable in Settings.',
          requiresSettings: true
        };
      }

      return {
        granted: false,
        canAskAgain: true,
        message: 'Gallery permission denied'
      };

    } catch (error) {
      console.error('Gallery permission request failed:', error);
      return {
        granted: false,
        canAskAgain: true,
        message: 'Failed to request gallery permission'
      };
    }
  }

  // Request all essential permissions for camera use
  async requestEssentialPermissions(): Promise<{
    camera: PermissionResult;
    microphone: PermissionResult;
    allGranted: boolean;
  }> {
    const camera = await this.requestCameraPermission();
    const microphone = await this.requestMicrophonePermission();
    
    return {
      camera,
      microphone,
      allGranted: camera.granted && microphone.granted
    };
  }

  // Show permission explanation to user
  private showPermissionExplanation(explanation: {
    title: string;
    description: string;
    features: string[];
    security: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const featureList = explanation.features.join('\\n');
      const message = `${explanation.description}\\n\\n${featureList}\\n\\n${explanation.security}`;
      
      Alert.alert(
        explanation.title,
        message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Continue',
            style: 'default',
            onPress: () => resolve(true)
          }
        ],
        { cancelable: false }
      );
    });
  }

  // Record permission grant in backend for security audit
  private async recordPermissionGrant(
    permissionType: 'CAMERA' | 'MICROPHONE' | 'GALLERY', 
    reason: string
  ): Promise<void> {
    try {
      // Record in authentication service
      await authService.requestPermission(permissionType, reason);
      
      // Create blockchain audit trail
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        await blockchainService.createAuditTrail(
          currentUser.id,
          'permission_granted',
          `${permissionType} permission granted: ${reason}`,
          'low'
        );
      }
    } catch (error) {
      console.error('Failed to record permission grant:', error);
    }
  }

  // Check if permission is currently granted
  async checkPermissionStatus(type: 'CAMERA' | 'MICROPHONE' | 'GALLERY'): Promise<{
    granted: boolean;
    canAskAgain: boolean;
  }> {
    try {
      switch (type) {
        case 'CAMERA':
          const { status: cameraStatus, canAskAgain: cameraCanAsk } = await Camera.getCameraPermissionsAsync();
          return { granted: cameraStatus === 'granted', canAskAgain: cameraCanAsk };
          
        case 'MICROPHONE':
          const { status: micStatus, canAskAgain: micCanAsk } = await Audio.getPermissionsAsync();
          return { granted: micStatus === 'granted', canAskAgain: micCanAsk };
          
        case 'GALLERY':
          const { status: galleryStatus, canAskAgain: galleryCanAsk } = await MediaLibrary.getPermissionsAsync();
          return { granted: galleryStatus === 'granted', canAskAgain: galleryCanAsk };
          
        default:
          return { granted: false, canAskAgain: true };
      }
    } catch (error) {
      console.error(`Failed to check ${type} permission status:`, error);
      return { granted: false, canAskAgain: true };
    }
  }

  // Open device settings for manual permission configuration
  async openDeviceSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Failed to open device settings:', error);
      Alert.alert(
        'Settings Unavailable',
        'Please manually open your device settings and enable permissions for SnapSecure.',
        [{ text: 'OK' }]
      );
    }
  }

  // Get current permission status for all permissions
  async getAllPermissionStatuses(): Promise<{
    camera: { granted: boolean; canAskAgain: boolean };
    microphone: { granted: boolean; canAskAgain: boolean };
    gallery: { granted: boolean; canAskAgain: boolean };
  }> {
    const [camera, microphone, gallery] = await Promise.all([
      this.checkPermissionStatus('CAMERA'),
      this.checkPermissionStatus('MICROPHONE'),
      this.checkPermissionStatus('GALLERY')
    ]);

    return { camera, microphone, gallery };
  }

  // Show permission denied help
  showPermissionDeniedHelp(permissionType: 'CAMERA' | 'MICROPHONE' | 'GALLERY'): void {
    const explanation = this.getPermissionExplanation(permissionType);
    
    Alert.alert(
      `${explanation.title} Required`,
      `${explanation.description}\\n\\nTo enable this permission:\\n1. Go to your device Settings\\n2. Find SnapSecure in the app list\\n3. Enable ${explanation.title} permission\\n4. Return to SnapSecure`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => this.openDeviceSettings()
        }
      ]
    );
  }
}

export const permissionService = PermissionService.getInstance();