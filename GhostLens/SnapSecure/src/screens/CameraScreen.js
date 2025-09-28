import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import PermissionGuard from '../components/PermissionGuard';
import { permissionService } from '../services/permissionServiceMock';
import { deviceGalleryService } from '../services/deviceGalleryService';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(FlashMode.off);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);
  const recordingTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  const toggleCameraType = () => {
    setCameraType(current => 
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      switch (current) {
        case FlashMode.off:
          return FlashMode.on;
        case FlashMode.on:
          return FlashMode.auto;
        case FlashMode.auto:
          return FlashMode.off;
        default:
          return FlashMode.off;
      }
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case FlashMode.on:
        return 'flash';
      case FlashMode.auto:
        return 'flash-outline';
      case FlashMode.off:
      default:
        return 'flash-off';
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      // Navigate to preview screen with the captured photo
      navigation.navigate('Preview', { 
        media: photo, 
        type: 'photo',
        source: 'camera'
      });
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);

      // Start the timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto stop at 60 seconds (Snapchat-style limit)
          if (newDuration >= 60) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: 60,
        mute: false,
      });

      // Navigate to preview screen with the recorded video
      navigation.navigate('Preview', { 
        media: video, 
        type: 'video',
        source: 'camera'
      });
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGalleryPicker = async () => {
    try {
      const selectedMedia = await deviceGalleryService.showGalleryPicker();
      
      if (selectedMedia) {
        // Navigate to preview screen with selected media from device gallery
        navigation.navigate('Preview', {
          media: { uri: selectedMedia.uri },
          type: selectedMedia.type,
          source: 'device_gallery',
          mediaInfo: selectedMedia
        });
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select media from gallery');
    }
  };

  const renderCameraControls = () => (
    <View style={styles.controlsContainer}>
      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleFlash}
        >
          <Ionicons name={getFlashIcon()} size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.recordingIndicator}>
          {isRecording && (
            <>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>{formatTime(recordingDuration)}</Text>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleCameraType}
        >
          <Ionicons name="camera-reverse" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={styles.galleryButton}
          onPress={handleGalleryPicker}
          onLongPress={() => navigation.navigate('Gallery')}
        >
          <Ionicons name="images" size={24} color="white" />
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            isRecording && styles.captureButtonRecording,
            isCapturing && styles.captureButtonCapturing
          ]}
          onPress={isRecording ? stopRecording : takePicture}
          onLongPress={!isRecording ? startRecording : undefined}
          disabled={isCapturing}
        >
          <View style={[
            styles.captureButtonInner,
            isRecording && styles.captureButtonInnerRecording
          ]} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionText}>
          {isRecording 
            ? 'Tap to stop recording' 
            : 'Tap for photo • Hold for video'
          }
        </Text>
        <Text style={styles.galleryInstructionText}>
          Tap gallery icon to import • Hold to view saved snaps
        </Text>
      </View>
    </View>
  );

  const renderPermissionDenied = () => (
    <View style={styles.permissionDeniedContainer}>
      <Ionicons name="camera-off" size={64} color="#666" />
      <Text style={styles.permissionDeniedTitle}>Camera Access Required</Text>
      <Text style={styles.permissionDeniedText}>
        SnapSecure needs camera access to capture photos and videos. 
        Please enable camera permissions in your device settings.
      </Text>
      <TouchableOpacity 
        style={styles.openSettingsButton}
        onPress={() => permissionService.openAppSettings()}
      >
        <Text style={styles.openSettingsButtonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <PermissionGuard 
        requiredPermissions={['CAMERA', 'MICROPHONE']}
        fallbackComponent={renderPermissionDenied()}
        showExplanations={true}
      >
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={cameraType}
            flashMode={flashMode}
            ref={cameraRef}
            ratio="16:9"
          >
            {renderCameraControls()}
          </Camera>
        </View>
      </PermissionGuard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingTime: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonRecording: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    borderColor: '#FF3B30',
  },
  captureButtonCapturing: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  captureButtonInnerRecording: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 4,
  },
  galleryInstructionText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDeniedText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  openSettingsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  openSettingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});