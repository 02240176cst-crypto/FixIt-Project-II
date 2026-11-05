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
import { logoutUser } from '../services/authService';
import { auth } from '../services/firebaseConfig';
export default function ProfileScreen() {
  const user = auth.currentUser;

  const [name, setName] = useState(user?.displayName || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Invalid Name', 'Please enter your name.');
      return;
    }

    try {
      setLoading(true);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name.trim(),
        });
      }

      setEditing(false);
      Alert.alert('Success', 'Your profile name has been updated.');
    } catch (error) {
      Alert.alert('Error', 'Unable to update your profile name.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to change your profile picture.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      await uploadProfilePhoto(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Error', 'Unable to select your profile picture.');
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);

      const cloudName =
        process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset =
        process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration is missing.');
      }

      const formData = new FormData();

      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'fixit-profiles');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message || 'Photo upload failed.');
      }

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: data.secure_url,
        });
      }

      setPhotoURL(data.secure_url);
      Alert.alert('Success', 'Your profile picture has been updated.');
    } catch (error: any) {
      Alert.alert(
        'Upload Failed',
        error.message || 'Unable to upload your profile picture.',
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Unable to logout. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>My Profile</Text>
      <Text style={styles.subtitle}>
        Manage your personal information and account
      </Text>

      {/* Profile Information */}
      <View style={styles.profileCard}>
        <View style={styles.photoContainer}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.initial}>
                {(name || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Pressable
            style={styles.cameraButton}
            onPress={handlePickImage}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.cameraIcon}>📷</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.profileName}>{name || 'User'}</Text>
        <Text style={styles.email}>{user?.email || 'No email available'}</Text>

        <View style={styles.divider} />

        {editing ? (
          <>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.editButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setName(user?.displayName || '');
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.saveButton}
                onPress={handleSaveName}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            style={styles.editProfileButton}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editProfileText}>✏️  Edit Profile</Text>
          </Pressable>
        )}
      </View>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>

      <Pressable
        style={styles.optionCard}
        onPress={() => router.push('/settings')}
      >
        <View style={styles.optionIcon}>
          <Text style={styles.iconText}>⚙️</Text>
        </View>

        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Settings</Text>
          <Text style={styles.optionSubtitle}>
            Manage your app preferences and account settings
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Pressable
        style={styles.optionCard}
        onPress={() => router.push('/notifications')}
      >
        <View style={styles.optionIcon}>
          <Text style={styles.iconText}>🔔</Text>
        </View>

        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Notifications</Text>
          <Text style={styles.optionSubtitle}>
            View your report updates
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <View style={styles.optionCard}>
        <View style={styles.optionIcon}>
          <Text style={styles.iconText}>🔒</Text>
        </View>

        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Account Security</Text>
          <Text style={styles.optionSubtitle}>
            Your account is protected by Firebase Authentication
          </Text>
        </View>
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>↪  Logout</Text>
      </Pressable>

      <Text style={styles.footer}>FixIt – Community Issue Reporting System</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#153E75',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 5,
    marginBottom: 22,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 105,
    height: 105,
    borderRadius: 53,
  },
  placeholderImage: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: '#DCEBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1769AA',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1769AA',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 15,
  },
  profileName: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 5,
  },
  email: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EDF4',
    width: '100%',
    marginVertical: 20,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    color: '#334155',
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 15,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
  },
  cancelText: {
    color: '#334155',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1769AA',
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editProfileButton: {
    backgroundColor: '#E8F2FC',
    paddingVertical: 11,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  editProfileText: {
    color: '#1769AA',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 27,
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  optionIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#E8F2FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  iconText: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 17,
  },
  arrow: {
    fontSize: 27,
    color: '#94A3B8',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: '#FEECEC',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
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
    marginTop: 25,
  },
});