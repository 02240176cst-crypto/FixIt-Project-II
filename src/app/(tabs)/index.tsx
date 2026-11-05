
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { auth, db } from '@/services/firebaseConfig';
import { listenToNotifications } from '@/services/notificationService';

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

const BLUE = '#1D4ED8';
const DARK = '#0F172A';
const MUTED = '#64748B';
const BACKGROUND = '#F1F5F9';

type ReportStats = {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
};

type RecentReport = {
  id: string;
  title: string;
  category: string;
  location: string;
  status: string;
  timestamp?: Timestamp;
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
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const displayName =
    user?.displayName || user?.email?.split('@')[0] || 'there';

  const firstName = displayName.split(' ')[0];

  // Listen to notifications
  useEffect(() => {
    const unsubscribe = listenToNotifications((notifications) => {
      const unread = notifications.filter(
        (notification) => !notification.isRead
      ).length;

      setUnreadCount(unread);
    });

    return unsubscribe;
  }, []);

  // Listen to report statistics
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
          'Unable to load reports',
          'Please check your internet connection and try again.'
        );
      }
    );

    return unsubscribe;
  }, [userId]);

  // Listen to the latest three reports
  useEffect(() => {
    if (!userId) {
      setRecentReports([]);
      setRecentLoading(false);
      return;
    }

    setRecentLoading(true);

    const recentQuery = query(
      collection(db, 'reports'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(
      recentQuery,
      (snapshot) => {
        const reports: RecentReport[] = snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            title: data.title || 'Untitled Report',
            category: data.category || 'Other',
            location: data.location || 'Location not provided',
            status: data.status || 'Pending',
            timestamp: data.timestamp,
          };
        });

        setRecentReports(reports);
        setRecentLoading(false);
      },
      (error) => {
        console.error('Recent reports error:', error);
        setRecentLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#B45309';
      case 'In Progress':
        return '#1D4ED8';
      case 'Resolved':
        return '#15803D';
      default:
        return MUTED;
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#FEF3C7';
      case 'In Progress':
        return '#DBEAFE';
      case 'Resolved':
        return '#DCFCE7';
      default:
        return '#F1F5F9';
    }
  };

  const openReport = (reportId: string) => {
    router.push({
      pathname: '/report-details/[id]',
      params: { id: reportId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>FixIt</Text>
            <Text style={styles.brandSubtitle}>
              COMMUNITY ISSUE REPORTING
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/notifications')}
              accessibilityLabel={`${unreadCount} unread notifications`}
            >
              <Text style={styles.bellIcon}>🔔</Text>

              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* WELCOME */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingSmall}>WELCOME BACK</Text>

          <Text style={styles.greeting}>
            Hello, {firstName}!
          </Text>

          <Text style={styles.welcomeDescription}>
            Every report makes a difference. Help us keep your
            community clean, safe and well-maintained.
          </Text>
        </View>

        {/* REPORT BANNER */}
        <View style={styles.reportBanner}>
          <View style={styles.bannerTop}>
            <View style={styles.bannerLabelContainer}>
              <View style={styles.bannerDot} />
              <Text style={styles.bannerLabel}>
                MAKE A DIFFERENCE
              </Text>
            </View>

            <Text style={styles.bannerSymbol}>+</Text>
          </View>

          <Text style={styles.bannerTitle}>
            Notice a problem{'\n'}in your community?
          </Text>

          <Text style={styles.bannerDescription}>
            Report it through FixIt and help the relevant
            authorities take action.
          </Text>

          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/(tabs)/report')}
            activeOpacity={0.85}
          >
            <Text style={styles.reportButtonText}>
              Report an Issue
            </Text>

            <Text style={styles.reportButtonArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* REPORT STATISTICS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Your Report Activity
            </Text>

            <Text style={styles.sectionSubtitle}>
              An overview of your submitted reports
            </Text>
          </View>

          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalCardLeft}>
            <Text style={styles.totalLabel}>TOTAL SUBMITTED</Text>

            <Text style={styles.totalNumber}>
              {statsLoading ? '—' : stats.total}
            </Text>

            <Text style={styles.totalDescription}>
              Reports submitted by you
            </Text>
          </View>

          <View style={styles.totalIconCircle}>
            <Text style={styles.totalIcon}>▤</Text>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <View style={styles.statusCardTop}>
              <View style={[styles.statusIndicator, { backgroundColor: '#FEF3C7' }]} />
              <Text style={styles.statusCardLabel}>Pending</Text>
            </View>

            <Text style={[styles.statusNumber, { color: '#B45309' }]}>
              {statsLoading ? '—' : stats.pending}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardTop}>
              <View style={[styles.statusIndicator, { backgroundColor: '#DBEAFE' }]} />
              <Text style={styles.statusCardLabel}>In Progress</Text>
            </View>

            <Text style={[styles.statusNumber, { color: '#1D4ED8' }]}>
              {statsLoading ? '—' : stats.inProgress}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardTop}>
              <View style={[styles.statusIndicator, { backgroundColor: '#DCFCE7' }]} />
              <Text style={styles.statusCardLabel}>Resolved</Text>
            </View>

            <Text style={[styles.statusNumber, { color: '#15803D' }]}>
              {statsLoading ? '—' : stats.resolved}
            </Text>
          </View>
        </View>

        {/* QUICK ACCESS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <Text style={styles.sectionSubtitle}>
              Find what you need
            </Text>
          </View>
        </View>

        <View style={styles.quickAccessContainer}>
          <TouchableOpacity
            style={styles.quickAccessCard}
            onPress={() => router.push('/(tabs)/my-reports')}
            activeOpacity={0.8}
          >
            <View style={styles.quickIconBlue}>
              <Text style={styles.quickIconText}>▤</Text>
            </View>

            <View style={styles.quickTextContainer}>
              <Text style={styles.quickTitle}>My Reports</Text>
              <Text style={styles.quickDescription}>
                Check the progress of your reports
              </Text>
            </View>

            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessCard}
            onPress={() => router.push('/(tabs)/map')}
            activeOpacity={0.8}
          >
            <View style={styles.quickIconGreen}>
              <Text style={styles.quickIconText}>⌖</Text>
            </View>

            <View style={styles.quickTextContainer}>
              <Text style={styles.quickTitle}>Community Map</Text>
              <Text style={styles.quickDescription}>
                View reported issues on the map
              </Text>
            </View>

            <Text style={styles.quickArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT REPORTS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <Text style={styles.sectionSubtitle}>
              Your latest submitted issues
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/my-reports')}
          >
            <Text style={styles.seeAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        {recentLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={BLUE} />
            <Text style={styles.loadingText}>
              Loading your reports...
            </Text>
          </View>
        ) : recentReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>▤</Text>
            </View>

            <Text style={styles.emptyTitle}>
              No reports submitted yet
            </Text>

            <Text style={styles.emptyDescription}>
              Your submitted community issues will appear here.
              Start by reporting your first issue.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/report')}
            >
              <Text style={styles.emptyButtonText}>
                Submit Your First Report
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.recentCard}
                onPress={() => openReport(report.id)}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryInitial}>
                    {report.category.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {report.title}
                  </Text>

                  <Text style={styles.recentCategory}>
                    {report.category}
                  </Text>

                  <Text style={styles.recentLocation} numberOfLines={1}>
                    📍 {report.location}
                  </Text>
                </View>

                <View style={styles.recentRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBackground(report.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(report.status) },
                      ]}
                    >
                      {report.status}
                    </Text>
                  </View>

                  <Text style={styles.recentArrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>FixIt</Text>
          <Text style={styles.footerTagline}>
            Report. Track. Improve.
          </Text>
          <Text style={styles.footerDescription}>
            Together, building a better community.
          </Text>
        </View>
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
    paddingBottom: 35,
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  brandName: {
    fontSize: 25,
    fontWeight: '900',
    color: BLUE,
    letterSpacing: -0.8,
  },

  brandSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bellIcon: {
    fontSize: 21,
  },

  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
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

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: BLUE,
    fontSize: 18,
    fontWeight: '800',
  },

  // Welcome
  welcomeSection: {
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 20,
  },

  greetingSmall: {
    color: BLUE,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  greeting: {
    color: DARK,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 7,
  },

  welcomeDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },

  // Report banner
  reportBanner: {
    marginHorizontal: 20,
    backgroundColor: '#1E3A8A',
    borderRadius: 22,
    padding: 21,
    overflow: 'hidden',
  },

  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  bannerLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  bannerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },

  bannerLabel: {
    color: '#BFDBFE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  bannerSymbol: {
    color: '#93C5FD',
    fontSize: 30,
    fontWeight: '300',
  },

  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 31,
    marginTop: 13,
  },

  bannerDescription: {
    color: '#DBEAFE',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
    marginBottom: 18,
  },

  reportButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  reportButtonText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
  },

  reportButtonArrow: {
    color: '#1D4ED8',
    fontSize: 20,
  },

  // Section headings
  sectionHeader: {
    marginHorizontal: 21,
    marginTop: 27,
    marginBottom: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },

  liveText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '900',
  },

  // Total card
  totalCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 19,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  totalCardLeft: {
    flex: 1,
  },

  totalLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  totalNumber: {
    color: DARK,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 5,
  },

  totalDescription: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  totalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalIcon: {
    color: BLUE,
    fontSize: 29,
    fontWeight: 'bold',
  },

  // Status cards
  statusGrid: {
    marginHorizontal: 20,
    marginTop: 11,
    flexDirection: 'row',
    gap: 9,
  },

  statusCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 85,
  },

  statusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusCardLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '700',
  },

  statusNumber: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 9,
  },

  // Quick access
  quickAccessContainer: {
    marginHorizontal: 20,
    gap: 10,
  },

  quickAccessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  quickIconBlue: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickIconGreen: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickIconText: {
    color: BLUE,
    fontSize: 24,
    fontWeight: '700',
  },

  quickTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  quickTitle: {
    color: DARK,
    fontSize: 13,
    fontWeight: '800',
  },

  quickDescription: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  quickArrow: {
    color: '#64748B',
    fontSize: 25,
    marginLeft: 7,
  },

  // Recent reports
  seeAll: {
    color: BLUE,
    fontSize: 11,
    fontWeight: '800',
  },

  recentList: {
    marginHorizontal: 20,
    gap: 10,
  },

  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  categoryIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryInitial: {
    color: BLUE,
    fontSize: 18,
    fontWeight: '900',
  },

  recentInfo: {
    flex: 1,
    marginLeft: 11,
    marginRight: 5,
  },

  recentTitle: {
    color: DARK,
    fontSize: 12,
    fontWeight: '800',
  },

  recentCategory: {
    color: BLUE,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  recentLocation: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  recentRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  statusBadge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },

  recentArrow: {
    color: '#64748B',
    fontSize: 21,
    marginTop: 4,
  },

  // Empty and loading states
  loadingCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 9,
  },

  loadingText: {
    color: MUTED,
    fontSize: 11,
  },

  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIconText: {
    color: BLUE,
    fontSize: 27,
  },

  emptyTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },

  emptyButton: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 15,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Footer
  footer: {
    marginTop: 32,
    alignItems: 'center',
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    marginHorizontal: 20,
  },

  footerBrand: {
    color: BLUE,
    fontSize: 17,
    fontWeight: '900',
  },

  footerTagline: {
    color: DARK,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  footerDescription: {
    color: MUTED,
    fontSize: 10,
    marginTop: 5,
  },
});
