// Device gallery service for selecting media from user's device storage
// Uses expo-image-picker to access native device gallery

import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface DeviceMediaOptions {
  mediaTypes: 'Images' | 'Videos' | 'All';
  allowsEditing?: boolean;
  quality?: number;
  allowsMultipleSelection?: boolean;
}

export interface SelectedMedia {
  uri: string;
  type: 'photo' | 'video';
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  fileName?: string;
}

export class DeviceGalleryService {
  private static instance: DeviceGalleryService;

  private constructor() {}

  static getInstance(): DeviceGalleryService {
    if (!DeviceGalleryService.instance) {
      DeviceGalleryService.instance = new DeviceGalleryService();
    }
    return DeviceGalleryService.instance;
  }

  // Request permission to access device gallery
  async requestGalleryPermission(): Promise<{ granted: boolean; message: string }> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status === 'granted') {
        return {
          granted: true,
          message: 'Gallery access granted'
        };
      } else {
        return {
          granted: false,
          message: 'Gallery access denied. Please enable in device settings to select photos and videos.'
        };
      }
    } catch (error) {
      console.error('Error requesting gallery permission:', error);
      return {
        granted: false,
        message: 'Failed to request gallery permission'
      };
    }
  }

  // Check if gallery permission is granted
  async checkGalleryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking gallery permission:', error);
      return false;
    }
  }

  // Pick a single image from device gallery
  async pickImage(options: Partial<DeviceMediaOptions> = {}): Promise<SelectedMedia | null> {
    try {
      // Check permission first
      const hasPermission = await this.checkGalleryPermission();
      if (!hasPermission) {
        const permissionResult = await this.requestGalleryPermission();
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', permissionResult.message);
          return null;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: options.mediaTypes === 'Videos' 
          ? ImagePicker.MediaTypeOptions.Videos 
          : options.mediaTypes === 'Images'
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.All,
        allowsEditing: options.allowsEditing || false,
        quality: options.quality || 0.8,
        allowsMultipleSelection: options.allowsMultipleSelection || false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      // Determine media type based on asset properties
      const isVideo = asset.type === 'video' || 
                     (asset.uri.includes('.mp4') || asset.uri.includes('.mov') || 
                      asset.uri.includes('.avi') || asset.duration !== undefined);

      return {
        uri: asset.uri,
        type: isVideo ? 'video' : 'photo',
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        fileSize: asset.fileSize,
        fileName: asset.fileName || `${isVideo ? 'video' : 'photo'}_${Date.now()}`
      };
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'Failed to select media from gallery');
      return null;
    }
  }

  // Pick multiple images from device gallery
  async pickMultipleImages(options: Partial<DeviceMediaOptions> = {}): Promise<SelectedMedia[]> {
    try {
      // Check permission first
      const hasPermission = await this.checkGalleryPermission();
      if (!hasPermission) {
        const permissionResult = await this.requestGalleryPermission();
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', permissionResult.message);
          return [];
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: options.mediaTypes === 'Videos' 
          ? ImagePicker.MediaTypeOptions.Videos 
          : options.mediaTypes === 'Images'
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.All,
        allowsEditing: false, // Disable editing for multiple selection
        quality: options.quality || 0.8,
        allowsMultipleSelection: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
      }

      return result.assets.map(asset => {
        const isVideo = asset.type === 'video' || 
                       (asset.uri.includes('.mp4') || asset.uri.includes('.mov') || 
                        asset.uri.includes('.avi') || asset.duration !== undefined);

        return {
          uri: asset.uri,
          type: isVideo ? 'video' : 'photo',
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
          fileSize: asset.fileSize,
          fileName: asset.fileName || `${isVideo ? 'video' : 'photo'}_${Date.now()}`
        };
      });
    } catch (error) {
      console.error('Error picking multiple images from gallery:', error);
      Alert.alert('Error', 'Failed to select media from gallery');
      return [];
    }
  }

  // Show gallery picker with options
  async showGalleryPicker(): Promise<SelectedMedia | null> {
    return new Promise((resolve) => {
      Alert.alert(
        '📱 Select from Gallery',
        'Choose the type of media you want to select from your device',
        [
          {
            text: 'Photos Only',
            onPress: async () => {
              const result = await this.pickImage({ mediaTypes: 'Images' });
              resolve(result);
            }
          },
          {
            text: 'Videos Only', 
            onPress: async () => {
              const result = await this.pickImage({ mediaTypes: 'Videos' });
              resolve(result);
            }
          },
          {
            text: 'Photos & Videos',
            onPress: async () => {
              const result = await this.pickImage({ mediaTypes: 'All' });
              resolve(result);
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null)
          }
        ]
      );
    });
  }

  // Format file size for display
  formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Format duration for display
  formatDuration(seconds?: number): string {
    if (!seconds) return '';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const deviceGalleryService = DeviceGalleryService.getInstance();