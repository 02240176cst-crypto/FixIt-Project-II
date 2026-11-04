
import { useEffect, useState } from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logoutUser } from '@/services/authService';
import { auth, db } from '@/services/firebaseConfig';
import { listenToNotifications } from '@/services/notificationService';

import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

const BLUE = '#2563EB';
const DARK = '#172554';
const BACKGROUND = '#F5F8FF';
const MUTED = '#64748B';

type ReportStats = {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
};

const INITIAL_STATS: ReportStats = {
  total: 0,
  pending: 0,
  inProgress: 0,
  resolved: 0,
};

export default function HomeScreen() {
  const user = auth.currentUser;
  const userId = user?.uid;

  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<ReportStats>(INITIAL_STATS);
  const [statsLoading, setStatsLoading] = useState(true);

  // Listen for notification updates in real time.
  useEffect(() => {
    const unsubscribe = listenToNotifications((notifications) => {
      const unread = notifications.filter(
        (notification) => !notification.isRead
      ).length;

      setUnreadCount(unread);
    });

    return unsubscribe;
  }, []);

  // Listen to the signed-in citizen's reports in real time.
  useEffect(() => {
    if (!userId) {
      setStats(INITIAL_STATS);
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);

    const reportsQuery = query(
      collection(db, 'reports'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        let pending = 0;
        let inProgress = 0;
        let resolved = 0;

        snapshot.forEach((document) => {
          const report = document.data();

          switch (report.status) {
            case 'Pending':
              pending++;
              break;

            case 'In Progress':
              inProgress++;
              break;

            case 'Resolved':
              resolved++;
              break;
          }
        });

        setStats({
          total: snapshot.size,
          pending,
          inProgress,
          resolved,
        });

        setStatsLoading(false);
      },
      (error) => {
        console.error('Dashboard statistics error:', error);

        setStatsLoading(false);

        Alert.alert(
          'Unable to load statistics',
          'Please check your internet connection and try again.'
        );
      }
    );

    return unsubscribe;
  }, [userId]);

  const displayName =
    user?.displayName || user?.email?.split('@')[0] || 'there';

  const firstName = displayName.split(' ')[0];

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
            } catch {
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>F</Text>
            </View>

            <View>
              <Text style={styles.brandName}>FixIt</Text>
              <Text style={styles.brandSubtitle}>
                COMMUNITY CARE
              </Text>
            </View>
          </View>

          {/* Header actions */}
          <View style={styles.headerActions}>
            {/* Notification button */}
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
              accessibilityLabel={`${unreadCount} unread notifications`}
            >
              <Text style={styles.notificationIcon}>🔔</Text>

              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile button */}
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.profileInitial}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome banner */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTop}>
            <Text style={styles.welcomeLabel}>
              YOUR COMMUNITY, YOUR VOICE
            </Text>

            <Text style={styles.welcomeGreeting}>
              Hello, {firstName} 👋
            </Text>

            <Text style={styles.welcomeDescription}>
              Help make your neighbourhood safer, cleaner and better.
              Report problems and follow their progress with FixIt.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/(tabs)/report')}
          >
            <Text style={styles.reportButtonText}>
              +  Report an Issue
            </Text>

            <Text style={styles.reportArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Issue Overview
            </Text>

            <Text style={styles.sectionSubtitle}>
              Your reporting activity
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {/* Total Reports */}
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statIcon}>📋</Text>
              <View style={styles.totalDot} />
            </View>

            <Text style={styles.statNumber}>
              {statsLoading ? '...' : stats.total}
            </Text>

            <Text style={styles.statLabel}>
              Total Reports
            </Text>
          </View>

          {/* Pending */}
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statIcon}>⏳</Text>
              <View style={styles.pendingDot} />
            </View>

            <Text style={[styles.statNumber, { color: '#D97706' }]}>
              {statsLoading ? '...' : stats.pending}
            </Text>

            <Text style={styles.statLabel}>
              Pending
            </Text>
          </View>

          {/* In Progress */}
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statIcon}>🔄</Text>
              <View style={styles.progressDot} />
            </View>

            <Text style={[styles.statNumber, { color: '#2563EB' }]}>
              {statsLoading ? '...' : stats.inProgress}
            </Text>

            <Text style={styles.statLabel}>
              In Progress
            </Text>
          </View>

          {/* Resolved */}
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statIcon}>✓</Text>
              <View style={styles.resolvedDot} />
            </View>

            <Text style={[styles.statNumber, { color: '#16A34A' }]}>
              {statsLoading ? '...' : stats.resolved}
            </Text>

            <Text style={styles.statLabel}>
              Resolved
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Quick Actions
            </Text>

            <Text style={styles.sectionSubtitle}>
              What would you like to do?
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/my-reports')}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: '#EFF6FF' },
              ]}
            >
              <Text style={styles.actionEmoji}>📑</Text>
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                My Reports
              </Text>

              <Text style={styles.actionDescription}>
                Track your submitted issues
              </Text>
            </View>

            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/map')}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: '#ECFDF5' },
              ]}
            >
              <Text style={styles.actionEmoji}>📍</Text>
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Community Map
              </Text>

              <Text style={styles.actionDescription}>
                Explore reported locations
              </Text>
            </View>

            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Recent reports */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Recent Reports
            </Text>

            <Text style={styles.sectionSubtitle}>
              Keep track of your latest submissions
            </Text>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>📋</Text>
          </View>

          <Text style={styles.emptyTitle}>
            No recent reports displayed
          </Text>

          <Text style={styles.emptyDescription}>
            Visit My Reports to view and track your submitted
            community issues.
          </Text>

          <TouchableOpacity
            style={styles.viewReportsButton}
            onPress={() => router.push('/(tabs)/my-reports')}
          >
            <Text style={styles.viewReportsButtonText}>
              View My Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account section */}
        <View style={styles.accountCard}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountTitle}>
              Your Account
            </Text>

            <Text style={styles.accountEmail}>
              {user?.email || 'No email available'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>
              Log Out
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          FixIt · Report. Track. Improve.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: 'bold',
  },

  brandName: {
    color: DARK,
    fontSize: 22,
    fontWeight: '800',
  },

  brandSubtitle: {
    color: MUTED,
    fontSize: 9,
    letterSpacing: 1.6,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  notificationButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationIcon: {
    fontSize: 21,
  },

  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  profileButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInitial: {
    color: BLUE,
    fontSize: 19,
    fontWeight: 'bold',
  },

  welcomeCard: {
    backgroundColor: DARK,
    marginHorizontal: 20,
    marginTop: 22,
    padding: 21,
    borderRadius: 22,
  },

  welcomeTop: {
    marginBottom: 20,
  },

  welcomeLabel: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.3,
    marginBottom: 12,
  },

  welcomeGreeting: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },

  welcomeDescription: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
  },

  reportButton: {
    backgroundColor: BLUE,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  reportArrow: {
    color: '#FFFFFF',
    fontSize: 22,
  },

  sectionHeader: {
    marginHorizontal: 22,
    marginTop: 27,
    marginBottom: 14,
  },

  sectionTitle: {
    color: DARK,
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 5,
  },

  statsGrid: {
    marginHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 17,
    minHeight: 125,
  },

  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statIcon: {
    fontSize: 20,
  },

  totalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
  },

  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },

  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },

  resolvedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },

  statNumber: {
    color: DARK,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 12,
  },

  statLabel: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
  },

  actionsContainer: {
    marginHorizontal: 20,
    gap: 11,
  },

  actionCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionEmoji: {
    fontSize: 21,
  },

  actionTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  actionTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: 'bold',
  },

  actionDescription: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },

  actionArrow: {
    color: '#94A3B8',
    fontSize: 25,
  },

  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 23,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyEmoji: {
    fontSize: 27,
  },

  emptyTitle: {
    color: DARK,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
  },

  emptyDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },

  viewReportsButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 15,
  },

  viewReportsButtonText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '800',
  },

  accountCard: {
    marginHorizontal: 20,
    marginTop: 25,
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  accountInfo: {
    flex: 1,
    marginRight: 10,
  },

  accountTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: 'bold',
  },

  accountEmail: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },

  logoutButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  logoutText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: 'bold',
  },

  footer: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 22,
  },
});
