
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/services/firebaseConfig';

type Report = {
  id: string;
  category: string;
  title: string;
  description: string;
  location: string;
  imageUrl?: string | null;
  status: string;
  priority?: string;
  timestamp?: any;
};

export default function MyReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async (isRefresh = false) => {
    const user = auth.currentUser;

    if (!user) {
      setReports([]);
      setLoading(false);
      setRefreshing(false);
      setError('Please log in to view your reports.');
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const reportsQuery = query(
        collection(db, 'reports'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(reportsQuery);

      const reportList: Report[] = snapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
      })) as Report[];

      reportList.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() ?? 0;
        const timeB = b.timestamp?.toMillis?.() ?? 0;
        return timeB - timeA;
      });

      setReports(reportList);
    } catch (err: any) {
      console.log('Load reports error:', err);
      setError(err.message || 'Unable to load your reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return styles.resolvedBadge;
      case 'in progress':
        return styles.progressBadge;
      default:
        return styles.pendingBadge;
    }
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return styles.highPriority;
      case 'medium':
        return styles.mediumPriority;
      case 'low':
        return styles.lowPriority;
      default:
        return styles.unassignedPriority;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) {
      return 'Recently submitted';
    }

    return timestamp.toDate().toLocaleDateString();
  };

  const renderReport = ({ item }: { item: Report }) => {
    const priority = item.priority || 'Not assigned';

    return (
      <Pressable
        style={styles.reportCard}
        onPress={() =>
          router.push({
            pathname: '/report-details/[id]',
            params: { id: item.id },
          })
        }
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.reportImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <Text style={styles.category}>{item.category}</Text>

            <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
              <Text style={styles.statusText}>
                {item.status || 'Pending'}
              </Text>
            </View>
          </View>

          <Text style={styles.reportTitle}>{item.title}</Text>

          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location}>{item.location || 'Location not provided'}</Text>
          </View>

          <View style={styles.priorityRow}>
            <Text style={styles.priorityLabel}>Priority</Text>
            <View style={[styles.priorityBadge, getPriorityStyle(item.priority)]}>
              <Text style={styles.priorityText}>{priority}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.date}>
            Submitted: {formatDate(item.timestamp)}
          </Text>

          <Text style={styles.tapHint}>
            Tap to view full details →
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Reports</Text>

      <Text style={styles.subtitle}>
        View and track the issues you have reported.
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total reports submitted</Text>
        <Text style={styles.summaryNumber}>{reports.length}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your reports...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Unable to load reports</Text>
          <Text style={styles.emptyText}>{error}</Text>

          <Text style={styles.retryText} onPress={() => loadReports()}>
            Try again
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            reports.length === 0 ? styles.emptyList : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadReports(true)}
              colors={['#2563EB']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptyText}>
                Your submitted reports will appear here. Start by reporting a
                community issue.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: '#2563EB',
    padding: 20,
    borderRadius: 18,
    marginTop: 22,
    marginBottom: 20,
  },
  summaryLabel: {
    color: '#DBEAFE',
    fontSize: 14,
  },
  summaryNumber: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 5,
  },
  listContent: {
    paddingBottom: 110,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },
  reportImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  cardContent: {
    padding: 17,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  category: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  location: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  priorityLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  highPriority: {
    backgroundColor: '#FEE2E2',
  },
  mediumPriority: {
    backgroundColor: '#FEF3C7',
  },
  lowPriority: {
    backgroundColor: '#DCFCE7',
  },
  unassignedPriority: {
    backgroundColor: '#E2E8F0',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 13,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tapHint: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 25,
  },
  emptyIcon: {
    fontSize: 35,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
  retryText: {
    color: '#2563EB',
    fontWeight: 'bold',
    marginTop: 15,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    marginTop: 12,
  },
});
