import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { galleryService } from '../services/galleryServiceMock';

const { width, height } = Dimensions.get('window');

export default function PreviewScreen({ route, navigation }) {
  const { media, type, source, fromEdit } = route.params;
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if media has applied edits
  const hasEdits = media.edited && media.edits;
  const edits = hasEdits ? media.edits : null;

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await Share.share({
        url: media.uri,
        message: 'Check out this snap from SnapSecure! 📸',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share snap');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const result = await galleryService.saveMedia(media.uri, type, source);
      
      if (result.success) {
        Alert.alert(
          '✅ Saved Successfully',
          result.message + '\n\n🔒 Your media is encrypted and protected with blockchain verification.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack() 
            }
          ]
        );
      } else {
        Alert.alert(
          '❌ Save Failed',
          result.message,
          [
            { text: 'Try Again', onPress: handleSave },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving media:', error);
      Alert.alert(
        '❌ Save Failed',
        'An unexpected error occurred while saving. Please try again.',
        [
          { text: 'Try Again', onPress: handleSave },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to denormalize coordinates for current screen
  const denormalizeCoordinates = (normalizedX, normalizedY) => ({
    x: normalizedX * width,
    y: normalizedY * height
  });

  // Helper function to denormalize drawing paths
  const denormalizeDrawingPath = (normalizedPath, screenWidth, screenHeight) => {
    return normalizedPath.replace(/(\d+\.?\d*)/g, (match, coord) => {
      const normalizedValue = parseFloat(coord);
      const absoluteValue = normalizedValue * Math.max(screenWidth, screenHeight);
      return absoluteValue.toFixed(1);
    });
  };

  const renderEditedMedia = () => {
    // Get filter style if any
    const filterStyle = hasEdits && edits.filter !== 'none' 
      ? getFilterStyle(edits.filter) 
      : {};

    return (
      <View style={styles.mediaContainer}>
        {/* Base media */}
        {type === 'photo' ? (
          <Image source={{ uri: media.uri }} style={[styles.media, filterStyle]} />
        ) : (
          <Video
            source={{ uri: media.uri }}
            style={[styles.media, filterStyle]}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        )}

        {/* Filter overlay */}
        {hasEdits && edits.filter !== 'none' && (
          <View style={[styles.filterOverlay, getFilterOverlay(edits.filter)]} />
        )}

        {/* Drawing overlays */}
        {hasEdits && edits.drawingPaths && edits.drawingPaths.length > 0 && (
          <Svg style={styles.drawingOverlay} width={width} height={height}>
            {edits.drawingPaths.map((pathData, index) => (
              <Path
                key={index}
                d={pathData.normalizedPath || pathData.path}
                stroke={pathData.color}
                strokeWidth={pathData.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        )}

        {/* Text overlays */}
        {hasEdits && edits.textOverlays && edits.textOverlays.length > 0 && (
          edits.textOverlays.map(overlay => {
            const position = denormalizeCoordinates(overlay.x, overlay.y);
            return (
              <View
                key={overlay.id}
                style={[
                  styles.textOverlay,
                  {
                    left: position.x - 50,
                    top: position.y - 12,
                  }
                ]}
              >
                <Text style={[styles.overlayText, {
                  color: overlay.color,
                  fontSize: overlay.fontSize,
                  fontWeight: overlay.fontWeight
                }]}>
                  {overlay.text}
                </Text>
              </View>
            );
          })
        )}

        {/* Edit indicator */}
        {hasEdits && (
          <View style={styles.editIndicator}>
            <Ionicons name="brush" size={16} color="white" />
            <Text style={styles.editIndicatorText}>Edited</Text>
          </View>
        )}
      </View>
    );
  };

  const getFilterStyle = (filterType) => {
    switch (filterType) {
      case 'sepia': return { opacity: 0.8 };
      case 'mono': return { opacity: 0.9 };
      case 'warm': return { opacity: 0.7 };
      case 'cool': return { opacity: 0.7 };
      case 'vintage': return { opacity: 0.8 };
      default: return {};
    }
  };

  const getFilterOverlay = (filterType) => {
    switch (filterType) {
      case 'sepia': return { backgroundColor: 'rgba(139, 69, 19, 0.3)' };
      case 'mono': return { backgroundColor: 'rgba(128, 128, 128, 0.4)' };
      case 'warm': return { backgroundColor: 'rgba(255, 179, 71, 0.2)' };
      case 'cool': return { backgroundColor: 'rgba(135, 206, 235, 0.2)' };
      case 'vintage': return { backgroundColor: 'rgba(210, 105, 30, 0.25)' };
      default: return {};
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Snap',
      'Are you sure you want to discard this snap?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Media Preview with Edits */}
      {renderEditedMedia()}

      {/* Controls Overlay */}
      <View style={styles.overlay}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.mediaInfo}>
            <Text style={styles.mediaType}>
              {type === 'photo' ? '📸 Photo' : '🎥 Video'}
            </Text>
            <Text style={styles.securityBadge}>🔒 Encrypted</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleShare}
            disabled={isSharing}
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDiscard}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>Discard</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('Edit', { media, type, source, mediaInfo: route.params.mediaInfo })}
          >
            <Ionicons name="brush-outline" size={24} color="white" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, isSaving && styles.actionButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#30D158" size="small" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#30D158" />
            )}
            <Text style={[styles.actionText, { color: '#30D158' }]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  textOverlay: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
  },
  overlayText: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  editIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  editIndicatorText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaInfo: {
    alignItems: 'center',
  },
  mediaType: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  securityBadge: {
    color: '#30D158',
    fontSize: 12,
    marginTop: 2,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  editButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
});