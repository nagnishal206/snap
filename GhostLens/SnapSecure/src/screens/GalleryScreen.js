import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { galleryService } from '../services/galleryServiceMock';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3; // 3 columns with margins

export default function GalleryScreen({ navigation }) {
  const [savedMedia, setSavedMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load saved media when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedMedia();
    }, [])
  );

  const loadSavedMedia = async () => {
    try {
      setIsLoading(true);
      const media = await galleryService.getAllMedia();
      setSavedMedia(media);
    } catch (error) {
      console.error('Failed to load saved media:', error);
      Alert.alert('Error', 'Failed to load your saved snaps');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedMedia();
    setRefreshing(false);
  };

  const handleMediaPress = (mediaItem) => {
    navigation.navigate('Preview', {
      media: { uri: mediaItem.uri },
      type: mediaItem.type,
      source: 'gallery',
      savedId: mediaItem.id
    });
  };

  const handleDeleteMedia = (mediaItem) => {
    Alert.alert(
      'Delete Snap',
      `Are you sure you want to delete this ${mediaItem.type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await galleryService.deleteMedia(mediaItem.id);
            if (result.success) {
              loadSavedMedia(); // Refresh the list
            } else {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  };

  const renderMediaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.mediaItem}
      onPress={() => handleMediaPress(item)}
      onLongPress={() => handleDeleteMedia(item)}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.mediaThumbnail}
        resizeMode="cover"
      />
      
      {/* Media type indicator */}
      <View style={styles.mediaTypeIndicator}>
        <Ionicons
          name={item.type === 'video' ? 'play-circle' : 'camera'}
          size={16}
          color="white"
        />
      </View>

      {/* Encryption badge */}
      <View style={styles.encryptionBadge}>
        <Ionicons name="shield-checkmark" size={12} color="#30D158" />
      </View>

      {/* Timestamp */}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestampText}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={64} color="#666" />
      <Text style={styles.emptyTitle}>No Snaps Yet</Text>
      <Text style={styles.emptySubtitle}>
        Capture your first photo or video using the camera to see it here
      </Text>
      <TouchableOpacity
        style={styles.cameraButton}
        onPress={() => navigation.navigate('Camera')}
      >
        <Ionicons name="camera" size={24} color="white" />
        <Text style={styles.cameraButtonText}>Open Camera</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>My Snaps</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {savedMedia.length} {savedMedia.length === 1 ? 'snap' : 'snaps'} saved
        </Text>
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#30D158" />
          <Text style={styles.securityText}>Encrypted</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading && savedMedia.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color="#666" />
          <Text style={styles.loadingText}>Loading your snaps...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {savedMedia.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={savedMedia}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.mediaGrid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 16,
    color: '#ccc',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  securityText: {
    color: '#30D158',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  mediaGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  mediaTypeIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  encryptionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.9)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timestampContainer: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timestampText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
});