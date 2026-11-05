
import { auth } from '@/services/firebaseConfig';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function SettingsScreen() {
  const email = auth.currentUser?.email;

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send a password reset link to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert(
                'Email Sent',
                'Please check your email for the password reset link.'
              );
            } catch (error) {
              console.error('Password reset error:', error);
              Alert.alert(
                'Error',
                'Unable to send the reset email. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleLocationSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Unable to Open Settings',
        'Please open your phone settings and manage FixIt location permissions manually.'
      );
    }
  };

  const handleNotifications = () => {
    Alert.alert(
      'Notifications',
      'The notification screen is available for viewing report updates. Push notifications are planned for a future enhancement.'
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.heading}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your FixIt preferences
          </Text>
        </View>
      </View>

      {/* Account Settings */}
      <Text style={styles.sectionTitle}>Account Settings</Text>

      <View style={styles.card}>
        <Pressable
          style={styles.option}
          onPress={handlePasswordReset}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Change Password
            </Text>
            <Text style={styles.optionSubtitle}>
              Receive an email to reset your password
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* App Preferences */}
      <Text style={styles.sectionTitle}>App Preferences</Text>

      <View style={styles.card}>
        <Pressable
          style={styles.option}
          onPress={handleLocationSettings}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📍</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Location Permissions
            </Text>
            <Text style={styles.optionSubtitle}>
              Manage location access for reporting issues
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          style={styles.option}
          onPress={handleNotifications}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🔔</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Notifications
            </Text>
            <Text style={styles.optionSubtitle}>
              View notification information
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>

      <View style={styles.card}>
        <View style={styles.option}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>ℹ️</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              FixIt
            </Text>
            <Text style={styles.optionSubtitle}>
              Community Issue Reporting and Tracking System
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>
            Application
          </Text>
          <Text style={styles.versionValue}>
            Project II
          </Text>
        </View>
      </View>

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
    paddingTop: 45,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  backText: {
    fontSize: 32,
    color: '#1D4ED8',
    marginTop: -5,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 22,
    elevation: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 17,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  icon: {
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
    marginTop: 5,
    lineHeight: 16,
  },
  arrow: {
    fontSize: 25,
    color: '#94A3B8',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  versionLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  versionValue: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 12,
  },
});
