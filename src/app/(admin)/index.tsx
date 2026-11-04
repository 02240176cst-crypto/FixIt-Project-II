
import { router } from 'expo-router';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { logoutUser } from '@/services/authService';
import { auth, db } from '@/services/firebaseConfig';

type ReportStatus = 'Pending' | 'In Progress' | 'Resolved';
type IssuePriority = 'Low' | 'Medium' | 'High';

type Report = {
  id: string;
  userId?: string;
  title?: string;
  category?: string;
  description?: string;
  location?: string;
  status?: string;
  priority?: IssuePriority;
  userEmail?: string;
  timestamp?: {
    toDate: () => Date;
  } | null;
};

type FilterStatus = 'All' | ReportStatus;
type FilterPriority = 'All' | IssuePriority;

const REPORTS_PER_PAGE = 5;

const categories = [
  'All',
  'Road Damage',
  'Water Supply',
  'Electricity',
  'Garbage',
  'Street Light',
  'Other',
];

const priorityOrder: Record<IssuePriority, number> = {
  High: 1,
  Medium: 2,
  Low: 3,
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');

  const [selectedFilter, setSelectedFilter] =
    useState<FilterStatus>('All');

  const [selectedCategory, setSelectedCategory] =
    useState('All');

  const [selectedPriority, setSelectedPriority] =
    useState<FilterPriority>('All');

  const [searchQuery, setSearchQuery] = useState('');

  const [visibleCount, setVisibleCount] =
    useState(REPORTS_PER_PAGE);

  // LOGOUT
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);

              Alert.alert(
                'Logout Failed',
                'Unable to logout. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  // VERIFY ADMIN AND LISTEN TO REPORTS
  useEffect(() => {
    let unsubscribeReports: (() => void) | undefined;
    let isMounted = true;

    const verifyAdmin = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!isMounted) return;

        if (
          !userSnapshot.exists() ||
          userSnapshot.data().role !== 'admin'
        ) {
          router.replace('/(tabs)');
          return;
        }

        const reportsQuery = query(
          collection(db, 'reports'),
          orderBy('timestamp', 'desc')
        );

        unsubscribeReports = onSnapshot(
          reportsQuery,
          (snapshot) => {
            if (!isMounted) return;

            const reportList = snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })) as Report[];

            setReports(reportList);
            setError('');
            setLoading(false);
          },
          (err) => {
            console.error('Reports loading error:', err);

            if (isMounted) {
              setError(
                'Unable to load reports. Please try again.'
              );
              setLoading(false);
            }
          }
        );
      } catch (err) {
        console.error('Admin verification failed:', err);

        if (isMounted) {
          setError(
            'Unable to verify administrator access.'
          );
          setLoading(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
      unsubscribeReports?.();
    };
  }, []);

  // RESET PAGINATION WHEN FILTERS CHANGE
  useEffect(() => {
    setVisibleCount(REPORTS_PER_PAGE);
  }, [
    selectedFilter,
    selectedCategory,
    selectedPriority,
    searchQuery,
  ]);

  // DASHBOARD STATISTICS
  const totalReports = reports.length;

  const pendingReports = reports.filter(
    (report) => report.status === 'Pending'
  ).length;

  const inProgressReports = reports.filter(
    (report) => report.status === 'In Progress'
  ).length;

  const resolvedReports = reports.filter(
    (report) => report.status === 'Resolved'
  ).length;

  // FILTER AND SORT REPORTS
  const filteredReports = reports
    .filter((report) => {
      const matchesStatus =
        selectedFilter === 'All' ||
        report.status === selectedFilter;

      const matchesCategory =
        selectedCategory === 'All' ||
        report.category === selectedCategory;

      // Older reports without a priority are treated as Medium.
      const reportPriority =
        report.priority || 'Medium';

      const matchesPriority =
        selectedPriority === 'All' ||
        reportPriority === selectedPriority;

      const searchText = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        [
          report.title,
          report.category,
          report.location,
          report.description,
          report.userEmail,
          report.priority,
        ].some((value) =>
          value?.toLowerCase().includes(searchText)
        );

      return (
        matchesStatus &&
        matchesCategory &&
        matchesPriority &&
        matchesSearch
      );
    })
    .sort((a, b) => {
      const priorityA =
        priorityOrder[a.priority || 'Medium'];

      const priorityB =
        priorityOrder[b.priority || 'Medium'];

      return priorityA - priorityB;
    });

  // PAGINATION
  const visibleReports = filteredReports.slice(
    0,
    visibleCount
  );

  const hasMoreReports =
    visibleCount < filteredReports.length;

  // FORMAT REPORT DATE
  const formatDate = (
    timestamp?: Report['timestamp']
  ) => {
    if (!timestamp?.toDate) {
      return 'Date unavailable';
    }

    return timestamp.toDate().toLocaleDateString();
  };

  // STATUS BADGE COLOURS
  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'Resolved':
        return styles.resolvedBadge;

      case 'In Progress':
        return styles.progressBadge;

      default:
        return styles.pendingBadge;
    }
  };

  // PRIORITY BADGE COLOURS
  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'High':
        return styles.highPriorityBadge;

      case 'Low':
        return styles.lowPriorityBadge;

      default:
        return styles.mediumPriorityBadge;
    }
  };

  // UPDATE REPORT STATUS AND CREATE IN-APP NOTIFICATION
  const updateReportStatus = async (
    report: Report,
    newStatus: ReportStatus
  ) => {
    if (!report.userId) {
      Alert.alert(
        'Unable to Update',
        'The citizen information for this report is missing.'
      );
      return;
    }

    if (report.status === newStatus) {
      return;
    }

    try {
      await updateDoc(doc(db, 'reports', report.id), {
        status: newStatus,
      });

      try {
        await addDoc(
          collection(
            db,
            'users',
            report.userId,
            'notifications'
          ),
          {
            title: 'Report Status Updated',
            message: `Your report "${report.title || 'Untitled Report'}" is now ${newStatus}.`,
            reportId: report.id,
            status: newStatus,
            isRead: false,
            timestamp: serverTimestamp(),
          }
        );

        Alert.alert(
          'Success',
          `Report status updated to ${newStatus}. The citizen has been notified.`
        );
      } catch (notificationError) {
        console.error(
          'Notification creation failed:',
          notificationError
        );

        Alert.alert(
          'Status Updated',
          `The report is now ${newStatus}, but the notification could not be created.`
        );
      }
    } catch (updateError) {
      console.error(
        'Status update failed:',
        updateError
      );

      Alert.alert(
        'Update Failed',
        'Unable to update the report status. Please try again.'
      );
    }
  };

  // UPDATE REPORT PRIORITY
  const updateReportPriority = async (
    report: Report,
    newPriority: IssuePriority
  ) => {
    const currentPriority =
      report.priority || 'Medium';

    if (currentPriority === newPriority) {
      return;
    }

    try {
      await updateDoc(doc(db, 'reports', report.id), {
        priority: newPriority,
      });

      Alert.alert(
        'Priority Updated',
        `The report priority has been changed to ${newPriority}.`
      );
    } catch (updateError) {
      console.error(
        'Priority update failed:',
        updateError
      );

      Alert.alert(
        'Update Failed',
        'Unable to update the report priority. Check your Firestore security rules and try again.'
      );
    }
  };

  // LOADING SCREEN
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading Admin Dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerLabel}>
            FIXIT ADMINISTRATION
          </Text>

          <Text style={styles.headerTitle}>
            Dashboard
          </Text>

          <Text style={styles.headerSubtitle}>
            Welcome, Administrator!
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>
              ↪ Logout
            </Text>
          </Pressable>

          <View style={styles.adminIcon}>
            <Text style={styles.adminIconText}>A</Text>
          </View>
        </View>
      </View>

      {/* OVERVIEW */}
      <Text style={styles.sectionTitle}>
        Overview
      </Text>

      <Text style={styles.sectionSubtitle}>
        Live summary of community reports
      </Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.totalCard]}>
          <Text style={styles.statLabel}>
            Total Reports
          </Text>

          <Text style={styles.statNumber}>
            {totalReports}
          </Text>

          <Text style={styles.statDescription}>
            All submissions
          </Text>
        </View>

        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={styles.statLabel}>
            Pending
          </Text>

          <Text style={styles.statNumber}>
            {pendingReports}
          </Text>

          <Text style={styles.statDescription}>
            Awaiting action
          </Text>
        </View>

        <View style={[styles.statCard, styles.progressCard]}>
          <Text style={styles.statLabel}>
            In Progress
          </Text>

          <Text style={styles.statNumber}>
            {inProgressReports}
          </Text>

          <Text style={styles.statDescription}>
            Being addressed
          </Text>
        </View>

        <View style={[styles.statCard, styles.resolvedCard]}>
          <Text style={styles.statLabel}>
            Resolved
          </Text>

          <Text style={styles.statNumber}>
            {resolvedReports}
          </Text>

          <Text style={styles.statDescription}>
            Successfully completed
          </Text>
        </View>
      </View>

      {/* RECENT REPORTS HEADING */}
      <View style={styles.reportsHeading}>
        <View>
          <Text style={styles.sectionTitle}>
            Recent Reports
          </Text>

          <Text style={styles.sectionSubtitle}>
            Manage community issues
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {filteredReports.length}
          </Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>⌕</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search reports..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearch}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* STATUS FILTERS */}
      <Text style={styles.filterTitle}>
        Filter by Status
      </Text>

      <View style={styles.filterContainer}>
        {(
          ['All', 'Pending', 'In Progress', 'Resolved'] as const
        ).map((filter) => {
          const isSelected =
            selectedFilter === filter;

          return (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={[
                styles.filterButton,
                isSelected && styles.activeFilterButton,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  isSelected && styles.activeFilterButtonText,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* CATEGORY FILTERS */}
      <Text style={styles.filterTitle}>
        Filter by Category
      </Text>

      <View style={styles.filterContainer}>
        {categories.map((category) => {
          const isSelected =
            selectedCategory === category;

          return (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.filterButton,
                isSelected && styles.activeFilterButton,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  isSelected && styles.activeFilterButtonText,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* PRIORITY FILTERS */}
      <Text style={styles.filterTitle}>
        Filter by Priority
      </Text>

      <View style={styles.filterContainer}>
        {(
          ['All', 'High', 'Medium', 'Low'] as const
        ).map((priority) => {
          const isSelected =
            selectedPriority === priority;

          return (
            <Pressable
              key={priority}
              onPress={() => setSelectedPriority(priority)}
              style={[
                styles.filterButton,
                isSelected && styles.activeFilterButton,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  isSelected && styles.activeFilterButtonText,
                ]}
              >
                {priority}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.resultText}>
        Showing {visibleReports.length} of{' '}
        {filteredReports.length} reports
      </Text>

      {/* ERROR AND EMPTY STATES */}
      {error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            Something went wrong
          </Text>

          <Text style={styles.emptyText}>
            {error}
          </Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📋</Text>

          <Text style={styles.emptyTitle}>
            No Reports Yet
          </Text>

          <Text style={styles.emptyText}>
            Community reports will appear here when
            citizens submit an issue.
          </Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🔍</Text>

          <Text style={styles.emptyTitle}>
            No Matching Reports
          </Text>

          <Text style={styles.emptyText}>
            Try changing your search or selecting
            different filters.
          </Text>

          <Pressable
            style={styles.resetButton}
            onPress={() => {
              setSearchQuery('');
              setSelectedFilter('All');
              setSelectedCategory('All');
              setSelectedPriority('All');
            }}
          >
            <Text style={styles.resetButtonText}>
              Clear Search and Filters
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* REPORT CARDS */}
          {visibleReports.map((report) => (
            <View
              key={report.id}
              style={styles.reportCard}
            >
              {/* REPORT INFORMATION */}
              <View style={styles.reportTop}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryIconText}>
                    !
                  </Text>
                </View>

                <View style={styles.reportTitleContainer}>
                  <Text style={styles.reportTitle}>
                    {report.title || 'Untitled Report'}
                  </Text>

                  <Text style={styles.reportCategory}>
                    {report.category || 'Other'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    getStatusStyle(report.status),
                  ]}
                >
                  <Text style={styles.statusText}>
                    {report.status || 'Pending'}
                  </Text>
                </View>
              </View>

              {/* PRIORITY BADGE */}
              <View style={styles.priorityRow}>
                <Text style={styles.priorityLabel}>
                  Priority:
                </Text>

                <View
                  style={[
                    styles.priorityBadge,
                    getPriorityStyle(report.priority),
                  ]}
                >
                  <Text style={styles.priorityBadgeText}>
                    {report.priority || 'Medium'}
                  </Text>
                </View>
              </View>

              {/* DESCRIPTION */}
              <Text
                style={styles.reportDescription}
                numberOfLines={2}
              >
                {report.description ||
                  'No description provided.'}
              </Text>

              {/* LOCATION AND DATE */}
              <View style={styles.reportFooter}>
                <Text
                  style={styles.reportLocation}
                  numberOfLines={1}
                >
                  📍 {report.location ||
                    'Location unavailable'}
                </Text>

                <Text style={styles.reportDate}>
                  {formatDate(report.timestamp)}
                </Text>
              </View>

              {/* VIEW DETAILS */}
             <Pressable
                style={styles.viewDetailsButton}
                onPress={() =>
                  router.push({
                    pathname: '/admin/report-details/[id]',
                    params: { id: report.id },
                  })
                }
             >
                <Text style={styles.viewDetailsText}>
                  View Details →
                </Text>
             </Pressable>

              {/* UPDATE PRIORITY */}
              <View style={styles.actionContainer}>
                <Text style={styles.actionTitle}>
                  Update Issue Priority
                </Text>

                <View style={styles.actionButtons}>
                  {(
                    ['Low', 'Medium', 'High'] as const
                  ).map((priority) => {
                    const currentPriority =
                      report.priority || 'Medium';

                    const selected =
                      currentPriority === priority;

                    return (
                      <Pressable
                        key={priority}
                        style={[
                          styles.actionButton,
                          selected && styles.selectedActionButton,
                        ]}
                        onPress={() =>
                          updateReportPriority(
                            report,
                            priority
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            selected &&
                              styles.selectedActionButtonText,
                          ]}
                        >
                          {priority}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* UPDATE STATUS */}
              <View style={styles.actionContainer}>
                <Text style={styles.actionTitle}>
                  Update Report Status
                </Text>

                <View style={styles.actionButtons}>
                  {(
                    [
                      'Pending',
                      'In Progress',
                      'Resolved',
                    ] as const
                  ).map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.actionButton,
                        report.status === status &&
                          styles.selectedActionButton,
                      ]}
                      onPress={() =>
                        updateReportStatus(
                          report,
                          status
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          report.status === status &&
                            styles.selectedActionButtonText,
                        ]}
                      >
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ))}

          {/* VIEW MORE / VIEW LESS */}
          {filteredReports.length > REPORTS_PER_PAGE && (
            <View style={styles.viewMoreContainer}>
              {hasMoreReports ? (
                <Pressable
                  style={styles.viewMoreButton}
                  onPress={() =>
                    setVisibleCount((current) =>
                      Math.min(
                        current + REPORTS_PER_PAGE,
                        filteredReports.length
                      )
                    )
                  }
                >
                  <Text style={styles.viewMoreText}>
                    View More Reports
                  </Text>

                  <Text style={styles.viewMoreArrow}>
                    ↓
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.viewMoreButton}
                  onPress={() =>
                    setVisibleCount(REPORTS_PER_PAGE)
                  }
                >
                  <Text style={styles.viewMoreText}>
                    View Less
                  </Text>

                  <Text style={styles.viewMoreArrow}>
                    ↑
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}

      {/* FOOTER */}
      <Text style={styles.footerText}>
        FixIt – Community Issue Reporting and Tracking System
      </Text>
    </ScrollView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },

  content: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8FF',
  },

  loadingText: {
    marginTop: 15,
    color: '#64748B',
    fontSize: 14,
  },

  header: {
    backgroundColor: '#1D4ED8',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerLabel: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: 'bold',
    marginTop: 7,
  },

  headerSubtitle: {
    color: '#DBEAFE',
    fontSize: 14,
    marginTop: 6,
  },

  headerActions: {
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },

  logoutButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },

  logoutButtonText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },

  adminIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  adminIconText: {
    color: '#1D4ED8',
    fontSize: 25,
    fontWeight: 'bold',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#172554',
  },

  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
    marginBottom: 15,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  statCard: {
    width: '48%',
    minHeight: 125,
    padding: 16,
    borderRadius: 16,
    marginBottom: 13,
    justifyContent: 'center',
  },

  totalCard: {
    backgroundColor: '#DBEAFE',
  },

  pendingCard: {
    backgroundColor: '#FEF3C7',
  },

  progressCard: {
    backgroundColor: '#E0E7FF',
  },

  resolvedCard: {
    backgroundColor: '#DCFCE7',
  },

  statLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },

  statNumber: {
    color: '#172554',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 8,
  },

  statDescription: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },

  reportsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  countBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    minWidth: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  countText: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },

  searchContainer: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginTop: 5,
    marginBottom: 18,
  },

  searchIcon: {
    fontSize: 25,
    color: '#64748B',
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    color: '#172554',
    fontSize: 14,
    paddingVertical: 8,
  },

  clearSearch: {
    color: '#64748B',
    fontSize: 18,
    padding: 5,
  },

  filterTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },

  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  filterButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  activeFilterButton: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  filterButtonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },

  activeFilterButtonText: {
    color: '#FFFFFF',
  },

  resultText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
  },

  reportCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  reportTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  categoryIconText: {
    color: '#2563EB',
    fontSize: 20,
    fontWeight: 'bold',
  },

  reportTitleContainer: {
    flex: 1,
    marginLeft: 10,
  },

  reportTitle: {
    color: '#172554',
    fontSize: 14,
    fontWeight: 'bold',
  },

  reportCategory: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 5,
  },

  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },

  progressBadge: {
    backgroundColor: '#DBEAFE',
  },

  resolvedBadge: {
    backgroundColor: '#DCFCE7',
  },

  statusText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: 'bold',
  },

  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 8,
  },

  priorityLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  priorityBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },

  highPriorityBadge: {
    backgroundColor: '#FEE2E2',
  },

  mediumPriorityBadge: {
    backgroundColor: '#FEF3C7',
  },

  lowPriorityBadge: {
    backgroundColor: '#DCFCE7',
  },

  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },

  reportDescription: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 15,
  },

  reportFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 13,
    paddingTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  reportLocation: {
    color: '#64748B',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },

  reportDate: {
    color: '#94A3B8',
    fontSize: 10,
  },

  viewDetailsButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 13,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  viewDetailsText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },

  actionContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 9,
  },

  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  actionButton: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
  },

  selectedActionButton: {
    backgroundColor: '#2563EB',
  },

  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  selectedActionButtonText: {
    color: '#FFFFFF',
  },

  viewMoreContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 12,
  },

  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 25,
    minWidth: 190,
  },

  viewMoreText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },

  viewMoreArrow: {
    color: '#2563EB',
    fontSize: 17,
    marginLeft: 9,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 5,
  },

  emptyIcon: {
    fontSize: 35,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#172554',
  },

  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  resetButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 17,
  },

  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  footerText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 25,
  },
});
