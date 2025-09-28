// Mock gallery service for frontend demo
// In production, this would save to device gallery and database

export interface SavedMedia {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  timestamp: number;
  source: 'camera' | 'gallery';
  encrypted: boolean;
  blockchainHash?: string;
}

export class GalleryServiceMock {
  private static instance: GalleryServiceMock;
  private savedMedia: SavedMedia[] = [];

  private constructor() {}

  static getInstance(): GalleryServiceMock {
    if (!GalleryServiceMock.instance) {
      GalleryServiceMock.instance = new GalleryServiceMock();
    }
    return GalleryServiceMock.instance;
  }

  // Save captured media to secure gallery
  async saveMedia(
    mediaUri: string, 
    type: 'photo' | 'video', 
    source: 'camera' | 'gallery' = 'camera'
  ): Promise<{ success: boolean; message: string; savedMedia?: SavedMedia }> {
    try {
      // Simulate saving delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate mock blockchain hash for security
      const blockchainHash = 'bc_' + Math.random().toString(36).substring(2, 15);
      
      const savedMediaItem: SavedMedia = {
        id: Date.now().toString(),
        uri: mediaUri,
        type,
        timestamp: Date.now(),
        source,
        encrypted: true,
        blockchainHash
      };

      // Add to mock storage
      this.savedMedia.unshift(savedMediaItem); // Add to beginning for recency

      console.log(`[SnapSecure] ${type} saved securely:`, {
        id: savedMediaItem.id,
        encrypted: true,
        blockchainVerified: true,
        hash: blockchainHash
      });

      return {
        success: true,
        message: `${type === 'photo' ? 'Photo' : 'Video'} saved securely with blockchain verification`,
        savedMedia: savedMediaItem
      };
    } catch (error) {
      console.error('Failed to save media:', error);
      return {
        success: false,
        message: 'Failed to save media. Please try again.'
      };
    }
  }

  // Get all saved media
  async getAllMedia(): Promise<SavedMedia[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...this.savedMedia];
  }

  // Get media by type
  async getMediaByType(type: 'photo' | 'video'): Promise<SavedMedia[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.savedMedia.filter(media => media.type === type);
  }

  // Delete media
  async deleteMedia(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const index = this.savedMedia.findIndex(media => media.id === id);
      if (index === -1) {
        return { success: false, message: 'Media not found' };
      }

      this.savedMedia.splice(index, 1);
      return { success: true, message: 'Media deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to delete media' };
    }
  }

  // Get media count
  getMediaCount(): { total: number; photos: number; videos: number } {
    const photos = this.savedMedia.filter(m => m.type === 'photo').length;
    const videos = this.savedMedia.filter(m => m.type === 'video').length;
    return { total: this.savedMedia.length, photos, videos };
  }

  // Simulate sharing media
  async shareMedia(id: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const media = this.savedMedia.find(m => m.id === id);
    if (!media) {
      return { success: false, message: 'Media not found' };
    }

    return {
      success: true,
      message: `${media.type === 'photo' ? 'Photo' : 'Video'} shared securely via SnapSecure`
    };
  }
}

export const galleryService = GalleryServiceMock.getInstance();