
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { auth, db } from '@/services/firebaseConfig';

type Report = {
  id: string;
  userId: string;
  category: string;
  title: string;
  description: string;
  location: string;
  imageUrl?: string | null;
  status: string;
  priority?: string;
  latitude?: number | null;
  longitude?: number | null;
  timestamp?: any;
};

export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadReport = async () => {
      setLoading(true);
      setError('');

      const user = auth.currentUser;

      if (!user || !id) {
        if (isActive) {
          setError('Please log in to view this report.');
          setLoading(false);
        }
        return;
      }

      try {
        const reportRef = doc(db, 'reports', id);
        const reportSnapshot = await getDoc(reportRef);

        if (!isActive) return;

        if (!reportSnapshot.exists()) {
          setError('This report does not exist.');
          return;
        }

        const data = {
          ...reportSnapshot.data(),
          id: reportSnapshot.id,
        } as Report;

        // Citizens may view only reports that they submitted.
        // This screen does not require an administrator role.
        if (data.userId !== user.uid) {
          setError('You do not have permission to view this report.');
          return;
        }

        setReport(data);
      } catch (err: any) {
        console.log('Citizen report details error:', err);
        if (isActive) {
          setError(err.message || 'Unable to load report details.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      isActive = false;
    };
  }, [id]);

  const handleDelete = () => {
    if (!report) return;

    Alert.alert(
      'Delete Report',
      'Are you sure you want to permanently delete this report? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);

              const user = auth.currentUser;

              if (!user || user.uid !== report.userId) {
                throw new Error('You cannot delete this report.');
              }

              await deleteDoc(doc(db, 'reports', report.id));

              Alert.alert(
                'Report Deleted',
                'Your report has been successfully deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/(tabs)/my-reports');
                    },
                  },
                ]
              );
            } catch (err: any) {
              console.log('Delete report error:', err);
              Alert.alert(
                'Delete Failed',
                err.message || 'Unable to delete this report.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!report) return;

    router.push({
      pathname: '/report-edit/[id]',
      params: { id: report.id },
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Recently submitted';
    return timestamp.toDate().toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return '#16A34A';
      case 'in progress':
        return '#2563EB';
      default:
        return '#D97706';
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading report details...</Text>
      </View>
    );
  }

  if (error || !report) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Report Details',
            headerShown: true,
            headerTintColor: '#2563EB',
          }}
        />
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Unable to open report</Text>
          <Text style={styles.errorText}>
            {error || 'Report not found.'}
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/my-reports')}
          >
            <Text style={styles.backButtonText}>Back to My Reports</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const priority = report.priority || 'Not assigned';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Report Details',
          headerShown: true,
          headerBackTitle: 'Back',
          headerTintColor: '#2563EB',
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerLabel}>YOUR ISSUE REPORT</Text>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.category}>{report.category}</Text>
        </View>

        {report.imageUrl ? (
          <Image
            source={{ uri: report.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageIcon}>📷</Text>
            <Text style={styles.noImageText}>No photo attached</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Report Status</Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(report.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(report.status) },
              ]}
            >
              {report.status || 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assigned Priority</Text>

          <View style={[styles.priorityBadge, getPriorityStyle(report.priority)]}>
            <Text style={styles.priorityText}>{priority}</Text>
          </View>

          <Text style={styles.priorityNote}>
            Priority is assigned and updated by the administrator.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {report.description || 'No description provided.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.detailText}>
            📍 {report.location || 'Location not provided'}
          </Text>

          {typeof report.latitude === 'number' &&
          typeof report.longitude === 'number' ? (
            <Text style={styles.coordinates}>
              Coordinates: {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Submission Information</Text>

          <Text style={styles.detailLabel}>Submitted on</Text>
          <Text style={styles.detailText}>
            {formatDate(report.timestamp)}
          </Text>

          <View style={styles.separator} />

          <Text style={styles.detailLabel}>Report ID</Text>
          <Text style={styles.reportId}>{report.id}</Text>
        </View>

        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleEdit}
          >
            <Text style={styles.editButtonText}>✏️  Edit Report</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteButtonText}>🗑️  Delete Report</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  loadingText: {
    color: '#64748B',
    marginTop: 12,
  },
  errorTitle: {
    color: '#1E3A8A',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 20,
  },
  headerLabel: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    color: '#1E3A8A',
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  category: {
    color: '#64748B',
    fontSize: 14,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    marginBottom: 18,
    backgroundColor: '#E2E8F0',
  },
  noImage: {
    height: 150,
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  noImageIcon: {
    fontSize: 35,
    marginBottom: 8,
  },
  noImageText: {
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 13,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 9,
  },
  statusText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    color: '#334155',
    fontSize: 13,
    fontWeight: 'bold',
  },
  priorityNote: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 10,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 23,
  },
  detailText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  coordinates: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 13,
  },
  reportId: {
    color: '#64748B',
    fontSize: 11,
  },
  actionContainer: {
    marginTop: 5,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
