
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
    doc,
    getDoc,
    updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { auth, db } from '@/services/firebaseConfig';
import { uploadReportImage } from '@/services/reportService';

const categories = [
  { name: 'Road Damage', emoji: '🛣️' },
  { name: 'Water Supply', emoji: '🚰' },
  { name: 'Electricity', emoji: '💡' },
  { name: 'Garbage', emoji: '🗑️' },
  { name: 'Street Light', emoji: '🔦' },
  { name: 'Other', emoji: '📌' },
];

const defaultRegion = {
  latitude: 27.5,
  longitude: 90.5,
  latitudeDelta: 1.5,
  longitudeDelta: 1.5,
};

export default function EditReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [mapRegion, setMapRegion] = useState(defaultRegion);

  const [existingImageUrl, setExistingImageUrl] =
    useState<string | null>(null);

  const [photo, setPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [removeExistingPhoto, setRemoveExistingPhoto] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load existing report
  useEffect(() => {
    const loadReport = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          setError('Please log in to edit your report.');
          return;
        }

        if (!id) {
          setError('Report ID is missing.');
          return;
        }

        const reportRef = doc(db, 'reports', id);
        const reportSnap = await getDoc(reportRef);

        if (!reportSnap.exists()) {
          setError('This report could not be found.');
          return;
        }

        const data = reportSnap.data();

        if (data.userId !== user.uid) {
          setError('You are not allowed to edit this report.');
          return;
        }

        setCategory(data.category ?? '');
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setLocation(data.location ?? '');
        setExistingImageUrl(data.imageUrl ?? null);

        // Load previously saved map coordinates
        if (
          typeof data.latitude === 'number' &&
          typeof data.longitude === 'number'
        ) {
          const coordinates = {
            latitude: data.latitude,
            longitude: data.longitude,
          };

          setSelectedLocation(coordinates);

          setMapRegion({
            ...coordinates,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to load the report.');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id]);

  // Get current GPS location
  const getCurrentLocation = async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow location access to use your current location.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setSelectedLocation(coordinates);

      setMapRegion({
        ...coordinates,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {
      Alert.alert(
        'Location unavailable',
        'Unable to get your current location. Please try again.'
      );
    }
  };

  // Choose a replacement photo
  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhoto(result.assets[0]);
        setRemoveExistingPhoto(false);
      }
    } catch {
      Alert.alert('Unable to open gallery', 'Please try again.');
    }
  };

  // Remove selected or existing photo
  const removePhoto = () => {
    if (photo) {
      setPhoto(null);
    } else {
      setRemoveExistingPhoto(true);
    }
  };

  // Save updated report
  const handleUpdate = async () => {
    if (!category) {
      Alert.alert(
        'Category required',
        'Please select an issue category.'
      );
      return;
    }

    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert(
        'Incomplete form',
        'Please fill in the title, description and location.'
      );
      return;
    }

    if (title.trim().length < 5) {
      Alert.alert(
        'Invalid title',
        'Please enter a more descriptive title.'
      );
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert(
        'Description too short',
        'Please provide at least 10 characters describing the issue.'
      );
      return;
    }

    if (!selectedLocation) {
      Alert.alert(
        'Location required',
        'Please select the issue location on the map.'
      );
      return;
    }

    const user = auth.currentUser;

    if (!user || !id) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    setSaving(true);

    try {
      const reportRef = doc(db, 'reports', id);

      // Verify ownership before updating
      const reportSnap = await getDoc(reportRef);

      if (
        !reportSnap.exists() ||
        reportSnap.data().userId !== user.uid
      ) {
        throw new Error(
          'You are not allowed to edit this report.'
        );
      }

      let imageUrl = existingImageUrl;

      if (photo) {
        imageUrl = await uploadReportImage(
          photo.uri,
          photo.fileName,
          photo.mimeType
        );
      } else if (removeExistingPhoto) {
        imageUrl = null;
      }

      await updateDoc(reportRef, {
        category,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        imageUrl,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });

      Alert.alert(
        'Report updated successfully! 🎉',
        'Your changes have been saved.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace({
                pathname: '/report-details/[id]',
                params: { id },
              });
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Update failed',
        err?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          Loading your report...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>
          Unable to edit report
        </Text>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayedImage =
    photo?.uri ||
    (!removeExistingPhoto ? existingImageUrl : null);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Edit Report',
          headerShown: true,
          headerBackTitle: 'Back',
          headerTintColor: '#2563EB',
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              UPDATE YOUR SUBMISSION
            </Text>

            <Text style={styles.heading}>Edit Report</Text>

            <Text style={styles.headerDescription}>
              Make changes to your reported issue.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>✏️</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>💙</Text>

          <Text style={styles.infoText}>
            Review your information and save your changes when finished.
          </Text>
        </View>

        {/* Category */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            01. Issue Category
          </Text>

          <Text style={styles.sectionSubtitle}>
            Select the category that best describes the issue.
          </Text>

          <View style={styles.categoryGrid}>
            {categories.map((item) => {
              const selected = category === item.name;

              return (
                <TouchableOpacity
                  key={item.name}
                  activeOpacity={0.75}
                  onPress={() => setCategory(item.name)}
                  style={[
                    styles.categoryItem,
                    selected && styles.categorySelected,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>
                    {item.emoji}
                  </Text>

                  <Text
                    style={[
                      styles.categoryName,
                      selected && styles.categoryNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>

                  {selected && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Issue details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            02. Issue Details
          </Text>

          <Text style={styles.sectionSubtitle}>
            Update the title and description.
          </Text>

          <Text style={styles.fieldLabel}>
            Issue Title *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter issue title"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.characterCount}>
            {title.length}/100
          </Text>

          <Text style={styles.fieldLabel}>
            Description *
          </Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text style={styles.characterCount}>
            {description.length}/1000
          </Text>
        </View>

        {/* Location and map */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            03. Issue Location
          </Text>

          <Text style={styles.sectionSubtitle}>
            Update where the problem can be found.
          </Text>

          <Text style={styles.fieldLabel}>
            Location / Nearby Landmark *
          </Text>

          <View style={styles.locationInput}>
            <Text style={styles.locationEmoji}>📍</Text>

            <TextInput
              style={styles.locationTextInput}
              placeholder="Enter area or nearby landmark"
              placeholderTextColor="#94A3B8"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <Text style={styles.helperText}>
            Tap the map to change the exact location of the issue.
          </Text>

          <TouchableOpacity
            style={styles.gpsButton}
            activeOpacity={0.8}
            onPress={getCurrentLocation}
          >
            <Text style={styles.gpsButtonText}>
              📍 Use My Current Location
            </Text>
          </TouchableOpacity>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              onPress={(event) => {
                setSelectedLocation(
                  event.nativeEvent.coordinate
                );
              }}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  title="Issue Location"
                  description="Selected community issue location"
                />
              )}
            </MapView>
          </View>

          {selectedLocation ? (
            <View style={styles.selectedLocationBox}>
              <Text style={styles.selectedLocationTitle}>
                ✓ Location Selected
              </Text>

              <Text style={styles.coordinatesText}>
                Latitude: {selectedLocation.latitude.toFixed(6)}
              </Text>

              <Text style={styles.coordinatesText}>
                Longitude: {selectedLocation.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <Text style={styles.mapHint}>
              No saved coordinates found. Tap the map to select the issue location.
            </Text>
          )}
        </View>

        {/* Photo */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            04. Report Photo
          </Text>

          <Text style={styles.sectionSubtitle}>
            Keep, replace or remove the current photo.
          </Text>

          {displayedImage ? (
            <View style={styles.photoPreviewContainer}>
              <Image
                source={{ uri: displayedImage }}
                style={styles.photoPreview}
              />

              <TouchableOpacity
                style={styles.removePhoto}
                onPress={removePhoto}
              >
                <Text style={styles.removePhotoText}>
                  ✕ Remove photo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBox}
              activeOpacity={0.75}
              onPress={pickPhoto}
            >
              <Text style={styles.uploadEmoji}>📷</Text>

              <Text style={styles.uploadTitle}>
                Add a photo
              </Text>

              <Text style={styles.uploadDescription}>
                Choose an image from your gallery
              </Text>
            </TouchableOpacity>
          )}

          {displayedImage && (
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={pickPhoto}
            >
              <Text style={styles.changePhotoText}>
                ↻ Replace photo
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.helperText}>
            Photos are optional. Only upload images relevant to the issue.
          </Text>
        </View>

        {/* Save changes */}
        <View style={styles.submitSection}>
          <Text style={styles.submitNote}>
            Check your changes before saving.
          </Text>

          <TouchableOpacity
            style={[
              styles.submitButton,
              saving && styles.submitDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  Save Changes
                </Text>

                <Text style={styles.submitArrow}>✓</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F7FF',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F7FF',
    padding: 25,
  },

  loadingText: {
    color: '#64748B',
    marginTop: 12,
    fontSize: 13,
  },

  errorIcon: {
    fontSize: 38,
    marginBottom: 12,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#173B78',
  },

  errorText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 9,
    lineHeight: 20,
  },

  backButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 11,
    marginTop: 20,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 25,
    paddingBottom: 110,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  eyebrow: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  heading: {
    fontSize: 27,
    fontWeight: '800',
    color: '#173B78',
  },

  headerDescription: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
  },

  headerIcon: {
    width: 57,
    height: 57,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerEmoji: {
    fontSize: 27,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F0FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },

  infoIcon: {
    fontSize: 21,
  },

  infoText: {
    flex: 1,
    color: '#315889',
    fontSize: 12,
    lineHeight: 19,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 18,
    marginBottom: 17,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    elevation: 2,
    shadowColor: '#173B78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },

  sectionTitle: {
    color: '#173B78',
    fontSize: 16,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 5,
    marginBottom: 18,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  categoryItem: {
    width: '48%',
    minHeight: 91,
    backgroundColor: '#F7F9FD',
    borderWidth: 1,
    borderColor: '#E8EEF8',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
  },

  categorySelected: {
    backgroundColor: '#EAF2FF',
    borderColor: '#3978E8',
    borderWidth: 1.5,
  },

  categoryEmoji: {
    fontSize: 23,
    marginBottom: 7,
  },

  categoryName: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },

  categoryNameSelected: {
    color: '#1D4ED8',
    fontWeight: '800',
  },

  checkMark: {
    position: 'absolute',
    top: 5,
    right: 8,
    color: '#2563EB',
    fontWeight: '900',
    fontSize: 13,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 9,
    marginTop: 5,
  },

  input: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFCFF',
    borderRadius: 11,
    paddingHorizontal: 13,
    color: '#1E293B',
    fontSize: 13,
  },

  textArea: {
    height: 125,
    paddingTop: 13,
    lineHeight: 20,
  },

  characterCount: {
    color: '#94A3B8',
    textAlign: 'right',
    fontSize: 10,
    marginTop: 5,
    marginBottom: 12,
  },

  locationInput: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFCFF',
    borderRadius: 11,
    paddingHorizontal: 12,
  },

  locationEmoji: {
    fontSize: 19,
    marginRight: 9,
  },

  locationTextInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 12,
    paddingVertical: 12,
  },

  helperText: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
  },

  gpsButton: {
    backgroundColor: '#EAF2FF',
    padding: 13,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },

  gpsButtonText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },

  mapContainer: {
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#DCE6F5',
  },

  map: {
    width: '100%',
    height: '100%',
  },

  selectedLocationBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  selectedLocationTitle: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },

  coordinatesText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 3,
  },

  mapHint: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },

  photoPreviewContainer: {
    alignItems: 'center',
  },

  photoPreview: {
    width: '100%',
    height: 190,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
  },

  removePhoto: {
    marginTop: 12,
    padding: 8,
  },

  removePhotoText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },

  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A9C6F5',
    borderRadius: 15,
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    paddingVertical: 25,
  },

  uploadEmoji: {
    fontSize: 29,
    marginBottom: 10,
  },

  uploadTitle: {
    color: '#173B78',
    fontWeight: '800',
    fontSize: 14,
  },

  uploadDescription: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 5,
  },

  changePhotoButton: {
    backgroundColor: '#E5EEFF',
    borderRadius: 9,
    padding: 11,
    marginTop: 12,
    alignItems: 'center',
  },

  changePhotoText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },

  submitSection: {
    marginTop: 3,
    alignItems: 'center',
  },

  submitNote: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 13,
  },

  submitButton: {
    backgroundColor: '#2563EB',
    width: '100%',
    minHeight: 55,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
  },

  submitDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  submitArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
  },

  cancelButton: {
    padding: 13,
    marginTop: 7,
  },

  cancelButtonText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
});
