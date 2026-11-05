
import { logoutUser } from '@/services/authService';
import { auth } from '@/services/firebaseConfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const user = auth.currentUser;

  const [displayName, setDisplayName] = useState(
    user?.displayName || 'User'
  );

  const [photoURL, setPhotoURL] = useState<string | null>(
    user?.photoURL || null
  );

  const [editing, setEditing] = useState(false);

  const [nameInput, setNameInput] = useState(
    user?.displayName || ''
  );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const email = user?.email || 'No email available';

  const initial = displayName.trim()
    ? displayName.trim().charAt(0).toUpperCase()
    : 'U';

  // Save updated name to Firebase Authentication
  const handleSaveName = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    if (!nameInput.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }

    try {
      setSaving(true);

      await updateProfile(user, {
        displayName: nameInput.trim(),
      });

      setDisplayName(nameInput.trim());
      setEditing(false);

      Alert.alert('Success', 'Your name has been updated.');
    } catch (error) {
      console.error('Profile name update error:', error);

      Alert.alert(
        'Error',
        'Unable to update your name. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Select and upload profile photo to Cloudinary
  const handleChangePhoto = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const image = result.assets[0];

      const cloudName =
        process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

      const uploadPreset =
        process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error(
          'Cloudinary configuration is missing. Please check your .env file.'
        );
      }

      setUploading(true);

      // Upload directly using Expo FileSystem
      const uploadResult = await FileSystem.uploadAsync(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        image.uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: image.mimeType || 'image/jpeg',
          parameters: {
            upload_preset: uploadPreset,
            folder: 'fixit-profiles',
          },
        }
      );

      // Read Cloudinary response
      let data: any;

      try {
        data = JSON.parse(uploadResult.body);
      } catch {
        throw new Error(
          'Invalid response received from Cloudinary.'
        );
      }

      if (
        uploadResult.status < 200 ||
        uploadResult.status >= 300
      ) {
        throw new Error(
          data.error?.message || 'Cloudinary photo upload failed.'
        );
      }

      if (!data.secure_url) {
        throw new Error(
          'Cloudinary did not return a valid photo URL.'
        );
      }

      // Save the uploaded photo URL to Firebase Authentication
      await updateProfile(user, {
        photoURL: data.secure_url,
      });

      // Update the profile screen immediately
      setPhotoURL(data.secure_url);

      Alert.alert(
        'Success',
        'Your profile photo has been updated.'
      );

    } catch (error: any) {
      console.error('Profile photo upload error:', error);

      Alert.alert(
        'Upload Failed',
        error.message || 'Unable to upload your profile photo.'
      );
    } finally {
      setUploading(false);
    }
  };

  // Logout confirmation
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of FixIt?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);

              Alert.alert(
                'Error',
                'Unable to log out. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>MY PROFILE</Text>

      <Text style={styles.subtitle}>
        Manage your personal information and account.
      </Text>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initial}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.profileName}>
          {displayName}
        </Text>

        <Text style={styles.profileEmail}>
          {email}
        </Text>

        <Pressable
          style={[
            styles.photoButton,
            uploading && styles.disabledButton,
          ]}
          onPress={handleChangePhoto}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.photoButtonText}>
                Uploading...
              </Text>
            </>
          ) : (
            <Text style={styles.photoButtonText}>
              Change Profile Photo
            </Text>
          )}
        </Pressable>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Personal Information
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.label}>
            Full Name
          </Text>

          {editing ? (
            <>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter your full name"
                autoCapitalize="words"
              />

              <View style={styles.editActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setNameInput(displayName);
                    setEditing(false);
                  }}
                >
                  <Text style={styles.cancelText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.saveButton}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveText}>
                      Save Changes
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.value}>
                {displayName}
              </Text>

              <Pressable
                onPress={() => {
                  setNameInput(displayName);
                  setEditing(true);
                }}
              >
                <Text style={styles.editText}>
                  Edit
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.separator} />

          <Text style={styles.label}>
            Email Address
          </Text>

          <Text style={styles.value}>
            {email}
          </Text>

          <Text style={styles.emailNote}>
            Your registered email address.
          </Text>
        </View>
      </View>

            {/* Account Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Account
        </Text>

        {/* Settings */}
        <Pressable
          style={styles.optionCard}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.optionIcon}>
            <Text style={styles.iconText}>⚙️</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Settings
            </Text>

            <Text style={styles.optionSubtitle}>
              Manage your app preferences and account settings
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Notifications */}
        <Pressable
          style={styles.optionCard}
          onPress={() => router.push('/notifications')}
        >
          <View style={styles.optionIcon}>
            <Text style={styles.iconText}>🔔</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Notifications
            </Text>

            <Text style={styles.optionSubtitle}>
              View updates about your reports
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Account Security */}
        <View style={styles.optionCard}>
          <View style={styles.optionIcon}>
            <Text style={styles.iconText}>🛡️</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Account Security
            </Text>

            <Text style={styles.optionSubtitle}>
              Your account is protected by Firebase Authentication
            </Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <Pressable
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>
          Log Out
        </Text>
      </Pressable>

      <Text style={styles.footer}>
        FixIt · Report. Track. Improve.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  container: {
    padding: 22,
    paddingTop: 40,
    paddingBottom: 35,
  },
  heading: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 22,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 14,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  profileName: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
  },
  photoButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 18,
    minWidth: 175,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 7,
  },
  value: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    color: '#1E293B',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 9,
    minWidth: 110,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 17,
  },
  emailNote: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 5,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
  },
  optionIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  iconText: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  optionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  arrow: {
    fontSize: 25,
    color: '#94A3B8',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 25,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 22,
  },
});
