import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

import { useRef, useState } from 'react';

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

import {
  submitReport,
  uploadReportImage,
  type IssuePriority,
} from '@/services/reportService';

const categories = [
  { name: 'Road Damage', emoji: '🛣️' },
  { name: 'Water Supply', emoji: '🚰' },
  { name: 'Electricity', emoji: '💡' },
  { name: 'Garbage', emoji: '🗑️' },
  { name: 'Street Light', emoji: '🔦' },
  { name: 'Other', emoji: '📌' },
];

const priorities = [
  {
    name: 'Low',
    description: 'Can be addressed later',
    color: '#16A34A',
    background: '#F0FDF4',
  },
  {
    name: 'Medium',
    description: 'Needs attention',
    color: '#D97706',
    background: '#FFFBEB',
  },
  {
    name: 'High',
    description: 'Needs urgent attention',
    color: '#DC2626',
    background: '#FEF2F2',
  },
] as const;

export default function ReportScreen() {
  // Prevent duplicate submissions if the button is tapped repeatedly.
  const submittingRef = useRef(false);

  const [category, setCategory] = useState('');
  const [priority, setPriority] =
    useState<IssuePriority>('Medium');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const [photo, setPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [loading, setLoading] = useState(false);

  // Selected map coordinates
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Initial map region: Bhutan
  const [mapRegion, setMapRegion] = useState({
    latitude: 27.5,
    longitude: 90.5,
    latitudeDelta: 1.5,
    longitudeDelta: 1.5,
  });

  // Pick an image from the gallery
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
      }
    } catch {
      Alert.alert(
        'Unable to open gallery',
        'Please try again.'
      );
    }
  };

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

      const position =
        await Location.getCurrentPositionAsync({
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

  // Submit report
  const handleSubmit = async () => {
    if (submittingRef.current) return;

    if (!category) {
      Alert.alert(
        'Category required',
        'Please select an issue category.'
      );
      return;
    }

    if (
      !title.trim() ||
      !description.trim() ||
      !location.trim()
    ) {
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

    submittingRef.current = true;
    setLoading(true);

    try {
      let imageUrl: string | null = null;

      if (photo) {
        imageUrl = await uploadReportImage(
          photo.uri,
          photo.fileName,
          photo.mimeType
        );
      }

      await submitReport({
        category: category.trim(),
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        priority,
        imageUrl,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });

      Alert.alert(
        'Report submitted successfully! 🎉',
        `Thank you for helping improve your community. Your report is marked as Pending with ${priority} priority.`
      );

      // Reset form
      setCategory('');
      setPriority('Medium');
      setTitle('');
      setDescription('');
      setLocation('');
      setPhoto(null);
      setSelectedLocation(null);

      setMapRegion({
        latitude: 27.5,
        longitude: 90.5,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      });
    } catch (error: any) {
      Alert.alert(
        'Submission failed',
        error?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              COMMUNITY IMPROVEMENT
            </Text>

            <Text style={styles.heading}>
              Report an Issue
            </Text>

            <Text style={styles.headerDescription}>
              Help us make your community a better place.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>📝</Text>
          </View>
        </View>

        {/* Information banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>💙</Text>

          <Text style={styles.infoText}>
            Your report helps local administrators identify
            and resolve community problems.
          </Text>
        </View>

        {/* Category */}
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionNumber}>01</Text>

            <View>
              <Text style={styles.sectionTitle}>
                Issue Category
              </Text>

              <Text style={styles.sectionSubtitle}>
                What type of problem are you reporting?
              </Text>
            </View>
          </View>

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

        {/* Issue Priority */}
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionNumber}>02</Text>

            <View>
              <Text style={styles.sectionTitle}>
                Issue Priority
              </Text>

              <Text style={styles.sectionSubtitle}>
                How urgent is this issue?
              </Text>
            </View>
          </View>

          <View style={styles.priorityContainer}>
            {priorities.map((item) => {
              const selected = priority === item.name;

              return (
                <TouchableOpacity
                  key={item.name}
                  activeOpacity={0.75}
                  onPress={() => setPriority(item.name)}
                  style={[
                    styles.priorityItem,
                    {
                      backgroundColor: item.background,
                      borderColor: selected
                        ? item.color
                        : '#E8EEF8',
                    },
                    selected && styles.prioritySelected,
                  ]}
                >
                  <View
                    style={[
                      styles.priorityIndicator,
                      { backgroundColor: item.color },
                    ]}
                  />

                  <View style={styles.priorityTextContainer}>
                    <Text
                      style={[
                        styles.priorityName,
                        { color: item.color },
                      ]}
                    >
                      {item.name}
                    </Text>

                    <Text style={styles.priorityDescription}>
                      {item.description}
                    </Text>
                  </View>

                  {selected && (
                    <Text
                      style={[
                        styles.priorityCheck,
                        { color: item.color },
                      ]}
                    >
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.helperText}>
            Select the priority based on the urgency of the
            community issue.
          </Text>
        </View>
                {/* Issue details */}
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionNumber}>03</Text>

            <View>
              <Text style={styles.sectionTitle}>
                Issue Details
              </Text>

              <Text style={styles.sectionSubtitle}>
                Tell us more about the problem.
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            Issue Title *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Damaged road near the school"
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
            placeholder="Describe the issue, its condition and how it affects the community..."
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

        {/* Location */}
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionNumber}>04</Text>

            <View>
              <Text style={styles.sectionTitle}>
                Issue Location
              </Text>

              <Text style={styles.sectionSubtitle}>
                Where can this problem be found?
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            Location / Nearby Landmark *
          </Text>

          <View style={styles.locationInput}>
            <Text style={styles.locationEmoji}>📍</Text>

            <TextInput
              style={styles.locationTextInput}
              placeholder="Enter area, street or nearby landmark"
              placeholderTextColor="#94A3B8"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <Text style={styles.helperText}>
            Please provide a clear location so the issue
            can be found easily.
          </Text>

          {/* Map selection */}
          <View style={styles.mapSection}>
            <Text style={styles.fieldLabel}>
              Select Exact Location *
            </Text>

            <Text style={styles.helperText}>
              Tap anywhere on the map to mark where the
              issue is located. You can also use GPS.
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
                No location selected. Tap the map to place a marker.
              </Text>
            )}
          </View>
        </View>

        {/* Photo */}
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionNumber}>05</Text>

            <View>
              <Text style={styles.sectionTitle}>
                Add a Photo
              </Text>

              <Text style={styles.sectionSubtitle}>
                Help us understand the issue visually.
              </Text>
            </View>
          </View>

          {photo ? (
            <View style={styles.photoPreviewContainer}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.photoPreview}
              />

              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => setPhoto(null)}
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
              <View style={styles.uploadIcon}>
                <Text style={styles.uploadEmoji}>📷</Text>
              </View>

              <Text style={styles.uploadTitle}>
                Upload an image
              </Text>

              <Text style={styles.uploadDescription}>
                Choose a photo from your gallery
              </Text>

              <View style={styles.chooseButton}>
                <Text style={styles.chooseButtonText}>
                  + Choose Photo
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.helperText}>
            Photo is optional. Only upload images relevant
            to the issue.
          </Text>
        </View>

        {/* Submit */}
        <View style={styles.submitSection}>
          <Text style={styles.submitNote}>
            Please review your information before submitting.
          </Text>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  Submit Report
                </Text>

                <Text style={styles.submitArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Together, we can build a better community. 💙
          </Text>
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

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 25,
    paddingBottom: 115,
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

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  sectionNumber: {
    color: '#2563EB',
    backgroundColor: '#EAF2FF',
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '800',
  },

  sectionTitle: {
    color: '#173B78',
    fontSize: 16,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
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

  // Priority styles
  priorityContainer: {
    gap: 10,
  },

  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 65,
  },

  prioritySelected: {
    borderWidth: 1.8,
  },

  priorityIndicator: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 12,
  },

  priorityTextContainer: {
    flex: 1,
  },

  priorityName: {
    fontSize: 13,
    fontWeight: '800',
  },

  priorityDescription: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },

  priorityCheck: {
    fontSize: 17,
    fontWeight: '900',
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

  mapSection: {
    marginTop: 18,
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

  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A9C6F5',
    borderRadius: 15,
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    paddingVertical: 23,
  },

  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#E2EDFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 11,
  },

  uploadEmoji: {
    fontSize: 25,
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

  chooseButton: {
    marginTop: 14,
    backgroundColor: '#E5EEFF',
    borderRadius: 9,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },

  chooseButtonText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
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
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },

  footerText: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 17,
    textAlign: 'center',
  },
});