import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { permissionService } from '../services/permissionServiceMock';

// Permission guard component that checks and requests permissions before allowing access
const PermissionGuard = ({ 
  children, 
  requiredPermissions = [], 
  fallbackComponent = null,
  showExplanations = true,
  onPermissionsGranted = null,
  onPermissionsDenied = null
}) => {
  const [permissionStatus, setPermissionStatus] = useState({
    camera: { granted: false, canAskAgain: true },
    microphone: { granted: false, canAskAgain: true },
    gallery: { granted: false, canAskAgain: true }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedPermissions, setHasCheckedPermissions] = useState(false);

  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    try {
      setIsLoading(true);
      const statuses = await permissionService.getAllPermissionStatuses();
      setPermissionStatus(statuses);
      setHasCheckedPermissions(true);
    } catch (error) {
      console.error('Failed to check initial permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (permissionType) => {
    try {
      setIsLoading(true);
      let result;

      switch (permissionType) {
        case 'CAMERA':
          result = await permissionService.requestCameraPermission(showExplanations);
          break;
        case 'MICROPHONE':
          result = await permissionService.requestMicrophonePermission(showExplanations);
          break;
        case 'GALLERY':
          result = await permissionService.requestGalleryPermission(showExplanations);
          break;
        default:
          return;
      }

      // Update permission status
      const updatedStatuses = await permissionService.getAllPermissionStatuses();
      setPermissionStatus(updatedStatuses);

      if (result.granted) {
        checkAllPermissionsGranted(updatedStatuses);
      } else if (result.requiresSettings) {
        permissionService.showPermissionDeniedHelp(permissionType);
      }
    } catch (error) {
      console.error(`Failed to request ${permissionType} permission:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAllPermissionsGranted = (statuses = permissionStatus) => {
    const allRequired = requiredPermissions.every(permission => {
      const permissionKey = permission.toLowerCase();
      return statuses[permissionKey]?.granted;
    });

    if (allRequired && onPermissionsGranted) {
      onPermissionsGranted();
    } else if (!allRequired && onPermissionsDenied) {
      onPermissionsDenied();
    }
  };

  const areAllRequiredPermissionsGranted = () => {
    return requiredPermissions.every(permission => {
      const permissionKey = permission.toLowerCase();
      return permissionStatus[permissionKey]?.granted;
    });
  };

  const getPermissionIcon = (permissionType) => {
    switch (permissionType) {
      case 'CAMERA': return '📸';
      case 'MICROPHONE': return '🎤';
      case 'GALLERY': return '🖼️';
      default: return '🔒';
    }
  };

  const getPermissionDescription = (permissionType) => {
    switch (permissionType) {
      case 'CAMERA': return 'Take photos and videos';
      case 'MICROPHONE': return 'Record audio for videos';
      case 'GALLERY': return 'Select photos from gallery';
      default: return 'Access required feature';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  // If all required permissions are granted, show children
  if (areAllRequiredPermissionsGranted()) {
    return children;
  }

  // Show fallback component if provided
  if (fallbackComponent) {
    return fallbackComponent;
  }

  // Show permission request UI
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔒 Permissions Required</Text>
        <Text style={styles.subtitle}>
          SnapSecure needs the following permissions to provide you with the best experience
        </Text>
      </View>

      <View style={styles.permissionsList}>
        {requiredPermissions.map((permission) => {
          const permissionKey = permission.toLowerCase();
          const isGranted = permissionStatus[permissionKey]?.granted;
          const canAskAgain = permissionStatus[permissionKey]?.canAskAgain;

          return (
            <View key={permission} style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionIcon}>
                  {getPermissionIcon(permission)}
                </Text>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionName}>{permission}</Text>
                  <Text style={styles.permissionDescription}>
                    {getPermissionDescription(permission)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.permissionStatus}>
                {isGranted ? (
                  <View style={styles.grantedBadge}>
                    <Text style={styles.grantedText}>✓ Granted</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.requestButton,
                      !canAskAgain && styles.disabledButton
                    ]}
                    onPress={() => requestPermission(permission)}
                    disabled={!canAskAgain}
                  >
                    <Text style={[
                      styles.requestButtonText,
                      !canAskAgain && styles.disabledButtonText
                    ]}>
                      {canAskAgain ? 'Grant' : 'Denied'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.securityNote}>
          🔒 Your privacy is protected. SnapSecure uses advanced encryption and blockchain technology to secure your data.
        </Text>
        
        {requiredPermissions.some(permission => {
          const permissionKey = permission.toLowerCase();
          return !permissionStatus[permissionKey]?.canAskAgain;
        }) && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => permissionService.openDeviceSettings()}
          >
            <Text style={styles.settingsButtonText}>
              Open Settings to Enable Permissions
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionsList: {
    marginBottom: 30,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  permissionText: {
    flex: 1,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  permissionStatus: {
    marginLeft: 15,
  },
  grantedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  grantedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  requestButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#666666',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#CCCCCC',
  },
  footer: {
    alignItems: 'center',
  },
  securityNote: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  settingsButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default PermissionGuard;