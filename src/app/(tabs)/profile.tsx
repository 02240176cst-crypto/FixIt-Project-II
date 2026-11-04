
import { auth } from '@/services/firebaseConfig';
import { router } from 'expo-router';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const user = auth.currentUser;
  const displayName = user?.displayName || 'User';
  const email = user?.email || 'No email available';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <Pressable
        style={styles.notificationButton}
        onPress={() => router.push('/notifications')}
      >
        <View style={styles.notificationIcon}>
          <Text style={styles.bell}>🔔</Text>
        </View>

        <View style={styles.notificationTextContainer}>
          <Text style={styles.notificationTitle}>
            Notifications
          </Text>

          <Text style={styles.notificationSubtitle}>
            View updates about your reports
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <Text style={styles.info}>
        Your account information will be displayed here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 25,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 18,
    alignItems: 'center',
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  name: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notificationIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  bell: {
    fontSize: 21,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  notificationSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  arrow: {
    fontSize: 27,
    color: '#94A3B8',
  },
  info: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 20,
    textAlign: 'center',
  },
});
