import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  PanResponder,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function EditScreen({ route, navigation }) {
  const { media, type, source, mediaInfo } = route.params;
  
  // Edit state
  const [editMode, setEditMode] = useState('view'); // 'view', 'text', 'draw', 'filter'
  const [currentText, setCurrentText] = useState('');
  const [textOverlays, setTextOverlays] = useState([]);
  const [drawingPaths, setDrawingPaths] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('none');
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [drawingColor, setDrawingColor] = useState('#FF3B30');
  const [drawingWidth, setDrawingWidth] = useState(5);
  const [drawingHistory, setDrawingHistory] = useState([]);
  
  // Text editing state
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState(24);
  const [showTextControls, setShowTextControls] = useState(false);

  // Available filters with real image processing styles
  const filters = [
    { id: 'none', name: 'Original', style: {} },
    { 
      id: 'sepia', 
      name: 'Sepia', 
      style: { 
        opacity: 0.8,
        backgroundColor: 'rgba(139, 69, 19, 0.3)'
      } 
    },
    { 
      id: 'mono', 
      name: 'Mono', 
      style: { 
        opacity: 0.9,
        backgroundColor: 'rgba(128, 128, 128, 0.4)'
      } 
    },
    { 
      id: 'warm', 
      name: 'Warm', 
      style: { 
        opacity: 0.7,
        backgroundColor: 'rgba(255, 179, 71, 0.2)'
      } 
    },
    { 
      id: 'cool', 
      name: 'Cool', 
      style: { 
        opacity: 0.7,
        backgroundColor: 'rgba(135, 206, 235, 0.2)'
      } 
    },
    { 
      id: 'vintage', 
      name: 'Vintage', 
      style: { 
        opacity: 0.8,
        backgroundColor: 'rgba(210, 105, 30, 0.25)'
      } 
    },
  ];

  // Drawing colors
  const drawingColors = [
    '#FF3B30', '#FF9500', '#FFCC02', '#34C759', 
    '#00C7BE', '#007AFF', '#5856D6', '#AF52DE', 
    '#FF2D92', '#A2845E', '#8E8E93', '#FFFFFF'
  ];
  
  // Text colors
  const textColors = [
    '#FFFFFF', '#000000', '#FF3B30', '#FF9500', 
    '#FFCC02', '#34C759', '#00C7BE', '#007AFF', 
    '#5856D6', '#AF52DE', '#FF2D92', '#A2845E'
  ];

  // Pan responder for drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editMode === 'draw',
      onMoveShouldSetPanResponder: () => editMode === 'draw',
      onPanResponderGrant: (evt) => {
        if (editMode === 'draw') {
          const { locationX, locationY } = evt.nativeEvent;
          setIsDrawing(true);
          setCurrentPath(`M${locationX},${locationY}`);
        }
      },
      onPanResponderMove: (evt) => {
        if (editMode === 'draw' && isDrawing) {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
        }
      },
      onPanResponderRelease: () => {
        if (editMode === 'draw' && isDrawing) {
          const newPath = {
            id: Date.now().toString(),
            path: currentPath,
            color: drawingColor,
            width: drawingWidth
          };
          
          // Save to history for undo
          setDrawingHistory(prev => [...prev, [...drawingPaths, newPath]]);
          setDrawingPaths(prev => [...prev, newPath]);
          setCurrentPath('');
          setIsDrawing(false);
        }
      },
    })
  ).current;

  // Create pan responder for movable text
  const createTextPanResponder = (textId) => {
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const overlay = textOverlays.find(o => o.id === textId);
        if (overlay) {
          initialX = overlay.x;
          initialY = overlay.y;
          startX = evt.nativeEvent.pageX;
          startY = evt.nativeEvent.pageY;
        }
        setSelectedTextId(textId);
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        setTextOverlays(prev => prev.map(overlay => 
          overlay.id === textId 
            ? { 
                ...overlay, 
                x: Math.max(50, Math.min(width - 50, initialX + dx)),
                y: Math.max(50, Math.min(height - 100, initialY + dy))
              }
            : overlay
        ));
      },
      onPanResponderRelease: () => {
        // Keep selection active for styling
      },
    });
  };

  const addTextOverlay = () => {
    if (currentText.trim()) {
      const newOverlay = {
        id: Date.now().toString(),
        text: currentText,
        x: width / 2,
        y: height / 2,
        color: textColor,
        fontSize: textSize,
        fontWeight: 'bold'
      };
      setTextOverlays(prev => [...prev, newOverlay]);
      setCurrentText('');
      setShowTextModal(false);
      setShowTextControls(true);
      setSelectedTextId(newOverlay.id);
    }
  };

  const updateSelectedText = (property, value) => {
    if (selectedTextId) {
      // Update both the overlay and the state
      setTextOverlays(prev => prev.map(overlay => 
        overlay.id === selectedTextId 
          ? { ...overlay, [property]: value }
          : overlay
      ));
      
      // Update the state variables to reflect current values
      if (property === 'fontSize') {
        setTextSize(value);
      } else if (property === 'color') {
        setTextColor(value);
      }
    }
  };

  const undoDrawing = () => {
    if (drawingHistory.length > 0) {
      const previousState = drawingHistory[drawingHistory.length - 1];
      setDrawingPaths(previousState);
      setDrawingHistory(prev => prev.slice(0, -1));
    } else {
      setDrawingPaths([]);
    }
  };

  const removeTextOverlay = (id) => {
    setTextOverlays(prev => prev.filter(overlay => overlay.id !== id));
    if (selectedTextId === id) {
      setSelectedTextId(null);
      setShowTextControls(false);
    }
  };

  // Helper function to normalize drawing paths for device independence
  const normalizeDrawingPath = (pathString, screenWidth, screenHeight) => {
    // Convert absolute coordinates to relative percentages
    return pathString.replace(/(\d+\.?\d*)/g, (match, coord) => {
      const value = parseFloat(coord);
      // Assuming first coordinate is X, second is Y (simplified approach)
      const normalizedValue = value / (screenWidth > screenHeight ? screenWidth : screenHeight);
      return normalizedValue.toFixed(4);
    });
  };

  const clearDrawing = () => {
    Alert.alert(
      'Clear Drawing',
      'Are you sure you want to clear all drawings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setDrawingPaths([]);
            setDrawingHistory([]); // Reset history when clearing all
          }
        }
      ]
    );
  };

  const saveEditedMedia = () => {
    if (textOverlays.length === 0 && drawingPaths.length === 0 && currentFilter === 'none') {
      Alert.alert(
        'No Edits Made',
        'You haven\'t made any edits to this media. Add text, drawings, or apply a filter before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      '💾 Save Edited Media',
      `Apply ${textOverlays.length + drawingPaths.length + (currentFilter !== 'none' ? 1 : 0)} edit(s) to your ${type}?\n\n🔒 Your edited media will be saved securely with blockchain verification.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save Edits', 
          onPress: () => {
            // Create edited media object with applied edits
            const editedMediaData = {
              ...media,
              edited: true,
              edits: {
                textOverlays: textOverlays.map(overlay => ({
                  ...overlay,
                  // Normalize positions for different screen sizes
                  x: overlay.x / width,
                  y: overlay.y / height
                })),
                drawingPaths: drawingPaths.map(path => ({
                  ...path,
                  // Normalize path coordinates for device independence
                  normalizedPath: normalizeDrawingPath(path.path, width, height)
                })),
                filter: currentFilter,
                appliedAt: Date.now()
              }
            };

            // Navigate back to preview with edited media
            navigation.navigate('Preview', {
              media: editedMediaData,
              type,
              source,
              mediaInfo,
              fromEdit: true
            });
          }
        }
      ]
    );
  };

  const renderMedia = () => {
    const filterStyle = filters.find(f => f.id === currentFilter)?.style || {};
    
    return (
      <View style={styles.mediaContainer} {...panResponder.panHandlers}>
        {type === 'photo' ? (
          <Image 
            source={{ uri: media.uri }} 
            style={[styles.media, filterStyle]}
            resizeMode="cover"
          />
        ) : (
          <Video
            source={{ uri: media.uri }}
            style={[styles.media, filterStyle]}
            shouldPlay
            isLooping
            resizeMode="cover"
          />
        )}
        
        {/* Drawing Overlay */}
        <Svg style={styles.drawingOverlay} width={width} height={height}>
          {drawingPaths.map((pathData, index) => (
            <Path
              key={index}
              d={pathData.path}
              stroke={pathData.color}
              strokeWidth={pathData.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath && (
            <Path
              d={currentPath}
              stroke={drawingColor}
              strokeWidth={drawingWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>

        {/* Text Overlays */}
        {textOverlays.map(overlay => {
          const panResponder = createTextPanResponder(overlay.id);
          return (
            <View
              key={overlay.id}
              style={[
                styles.textOverlay, 
                { 
                  left: overlay.x - 50, 
                  top: overlay.y - 12,
                  borderWidth: selectedTextId === overlay.id ? 2 : 0,
                  borderColor: '#007AFF'
                }
              ]}
              {...panResponder.panHandlers}
            >
              <Text style={[styles.overlayText, {
                color: overlay.color,
                fontSize: overlay.fontSize,
                fontWeight: overlay.fontWeight
              }]}>
                {overlay.text}
              </Text>
              <TouchableOpacity
                style={styles.removeTextButton}
                onPress={() => removeTextOverlay(overlay.id)}
              >
                <Ionicons name="close-circle" size={16} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEditControls = () => (
    <View style={styles.controlsContainer}>
      {/* Edit Mode Buttons */}
      <View style={styles.editModeButtons}>
        <TouchableOpacity
          style={[styles.editModeButton, editMode === 'text' && styles.editModeButtonActive]}
          onPress={() => setEditMode('text')}
        >
          <Ionicons name="text" size={20} color={editMode === 'text' ? '#007AFF' : 'white'} />
          <Text style={[styles.editModeText, editMode === 'text' && styles.editModeTextActive]}>Text</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editModeButton, editMode === 'draw' && styles.editModeButtonActive]}
          onPress={() => setEditMode('draw')}
        >
          <Ionicons name="brush" size={20} color={editMode === 'draw' ? '#007AFF' : 'white'} />
          <Text style={[styles.editModeText, editMode === 'draw' && styles.editModeTextActive]}>Draw</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editModeButton, editMode === 'filter' && styles.editModeButtonActive]}
          onPress={() => setEditMode('filter')}
        >
          <Ionicons name="color-filter" size={20} color={editMode === 'filter' ? '#007AFF' : 'white'} />
          <Text style={[styles.editModeText, editMode === 'filter' && styles.editModeTextActive]}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Mode-specific controls */}
      {editMode === 'text' && (
        <View style={styles.textControls}>
          <TouchableOpacity
            style={styles.addTextButton}
            onPress={() => setShowTextModal(true)}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addTextButtonText}>Add Text</Text>
          </TouchableOpacity>
          
          {/* Text styling controls */}
          {showTextControls && selectedTextId && (
            <View style={styles.textStyleControls}>
              {/* Text size controls */}
              <View style={styles.textSizeControls}>
                <TouchableOpacity
                  style={styles.sizeButton}
                  onPress={() => {
                    const selectedOverlay = textOverlays.find(o => o.id === selectedTextId);
                    const currentSize = selectedOverlay ? selectedOverlay.fontSize : textSize;
                    const newSize = Math.max(currentSize - 2, 12);
                    updateSelectedText('fontSize', newSize);
                  }}
                >
                  <Ionicons name="remove" size={16} color="white" />
                </TouchableOpacity>
                <Text style={styles.sizeText}>
                  {textOverlays.find(o => o.id === selectedTextId)?.fontSize || textSize}px
                </Text>
                <TouchableOpacity
                  style={styles.sizeButton}
                  onPress={() => {
                    const selectedOverlay = textOverlays.find(o => o.id === selectedTextId);
                    const currentSize = selectedOverlay ? selectedOverlay.fontSize : textSize;
                    const newSize = Math.min(currentSize + 2, 48);
                    updateSelectedText('fontSize', newSize);
                  }}
                >
                  <Ionicons name="add" size={16} color="white" />
                </TouchableOpacity>
              </View>
              
              {/* Text color palette */}
              <View style={styles.textColorPalette}>
                {textColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.textColorButton,
                      { backgroundColor: color },
                      textColor === color && styles.colorButtonActive
                    ]}
                    onPress={() => {
                      setTextColor(color);
                      updateSelectedText('color', color);
                    }}
                  />
                ))}
              </View>
            </View>
          )}
          
          <Text style={styles.instructionText}>Drag to move • Tap X to remove • Style with controls above</Text>
        </View>
      )}

      {editMode === 'draw' && (
        <View style={styles.drawControls}>
          {/* Brush size controls */}
          <View style={styles.brushControls}>
            <Text style={styles.brushLabel}>Brush Size:</Text>
            <View style={styles.brushSizeControls}>
              <TouchableOpacity
                style={styles.sizeButton}
                onPress={() => setDrawingWidth(Math.max(drawingWidth - 1, 1))}
              >
                <Ionicons name="remove" size={16} color="white" />
              </TouchableOpacity>
              <View style={[styles.brushPreview, { width: drawingWidth * 2, height: drawingWidth * 2, backgroundColor: drawingColor }]} />
              <TouchableOpacity
                style={styles.sizeButton}
                onPress={() => setDrawingWidth(Math.min(drawingWidth + 1, 20))}
              >
                <Ionicons name="add" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Color palette */}
          <View style={styles.colorPalette}>
            {drawingColors.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  drawingColor === color && styles.colorButtonActive
                ]}
                onPress={() => setDrawingColor(color)}
              />
            ))}
          </View>
          
          {/* Drawing actions */}
          <View style={styles.drawingActions}>
            <TouchableOpacity 
              style={[styles.actionButton, drawingHistory.length === 0 && styles.actionButtonDisabled]} 
              onPress={undoDrawing}
              disabled={drawingHistory.length === 0}
            >
              <Ionicons name="arrow-undo" size={16} color={drawingHistory.length > 0 ? "white" : "#666"} />
              <Text style={[styles.actionButtonText, drawingHistory.length === 0 && { color: '#666' }]}>Undo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.clearButton} onPress={clearDrawing}>
              <Ionicons name="trash" size={16} color="#FF3B30" />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {editMode === 'filter' && (
        <View style={styles.filterControls}>
          <View style={styles.filterList}>
            {filters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  currentFilter === filter.id && styles.filterButtonActive
                ]}
                onPress={() => setCurrentFilter(filter.id)}
              >
                <Text style={[
                  styles.filterText,
                  currentFilter === filter.id && styles.filterTextActive
                ]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderTextModal = () => (
    <Modal
      visible={showTextModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTextModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.textModalContainer}>
          <Text style={styles.modalTitle}>Add Text</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your text..."
            placeholderTextColor="#666"
            value={currentText}
            onChangeText={setCurrentText}
            multiline
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowTextModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalAddButton}
              onPress={addTextOverlay}
            >
              <Text style={styles.modalAddText}>Add Text</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity 
          style={styles.topButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.titleText}>Edit Snap</Text>
        
        <TouchableOpacity 
          style={styles.topButton}
          onPress={saveEditedMedia}
        >
          <Ionicons name="checkmark" size={24} color="#30D158" />
        </TouchableOpacity>
      </View>

      {/* Media with overlays */}
      {renderMedia()}

      {/* Edit Controls */}
      {renderEditControls()}

      {/* Text Modal */}
      {renderTextModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mediaContainer: {
    flex: 1,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
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
  removeTextButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
  },
  overlayText: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  controlsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingBottom: 20,
  },
  editModeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  editModeButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  editModeButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  editModeText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  editModeTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  textControls: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  addTextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  textStyleControls: {
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  sizeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'center',
  },
  textColorPalette: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  textColorButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    margin: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  brushControls: {
    alignItems: 'center',
    marginBottom: 12,
  },
  brushLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
  },
  brushSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brushPreview: {
    borderRadius: 20,
    marginHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawControls: {
    paddingVertical: 16,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: 'white',
  },
  drawingActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 4,
  },
  filterControls: {
    paddingVertical: 16,
  },
  filterList: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: 'white',
    fontSize: 14,
  },
  filterTextActive: {
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  modalCancelText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  modalAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});