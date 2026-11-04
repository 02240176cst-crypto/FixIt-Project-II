
import { auth, db } from '@/services/firebaseConfig';
import { router, useLocalSearchParams } from 'expo-router';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
    updateDoc,
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
import MapView, { Marker } from 'react-native-maps';

type Report = {
  id: string;
  userId?: string;
  userEmail?: string;
  title?: string;
  category?: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  priority?: string;
  timestamp?: any;
};

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

export default function AdminReportDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Check admin access and load the selected report.
  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        const adminRef = doc(db, 'users', user.uid);
        const adminSnapshot = await getDoc(adminRef);

        if (
          !adminSnapshot.exists() ||
          adminSnapshot.data().role !== 'admin'
        ) {
          Alert.alert(
            'Access denied',
            'Only administrators can view this page.'
          );

          router.replace('/(tabs)');
          return;
        }

        if (!id) {
          throw new Error('Report ID is missing.');
        }

        const reportRef = doc(db, 'reports', String(id));
        const reportSnapshot = await getDoc(reportRef);

        if (!reportSnapshot.exists()) {
          throw new Error('This report could not be found.');
        }

        if (isMounted) {
          setReport({
            id: reportSnapshot.id,
            ...reportSnapshot.data(),
          } as Report);
        }
      } catch (error: any) {
        console.error('Error loading report:', error);

        if (isMounted) {
          Alert.alert(
            'Unable to load report',
            error.message || 'Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Format the report submission date.
  const formatDate = (timestamp: any) => {
    if (!timestamp) {
      return 'Date not available';
    }

    try {
      let date: Date;

      if (typeof timestamp?.toDate === 'function') {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }

      if (Number.isNaN(date.getTime())) {
        return 'Date not available';
      }

      return date.toLocaleString();
    } catch {
      return 'Date not available';
    }
  };

  // Change report status and notify the citizen.
  const handleStatusUpdate = async (newStatus: string) => {
    if (!report || updating) {
      return;
    }

    if (report.status === newStatus) {
      Alert.alert(
        'No change',
        `This report is already marked as ${newStatus}.`
      );
      return;
    }

    Alert.alert(
      'Update Report Status',
      `Are you sure you want to change the status to "${newStatus}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: async () => {
            try {
              setUpdating(true);

              const reportRef = doc(db, 'reports', report.id);

              await updateDoc(reportRef, {
                status: newStatus,
              });

              setReport((previous) =>
                previous
                  ? { ...previous, status: newStatus }
                  : previous
              );

              // Create an in-app notification for the report owner.
              if (report.userId) {
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
                      message: `Your report "${report.title || 'Untitled report'}" is now ${newStatus}.`,
                      reportId: report.id,
                      status: newStatus,
                      isRead: false,
                      timestamp: serverTimestamp(),
                    }
                  );
                } catch (notificationError) {
                  console.error(
                    'Notification could not be created:',
                    notificationError
                  );

                  Alert.alert(
                    'Status updated',
                    'The report status was updated, but the notification could not be sent.'
                  );

                  return;
                }
              }

              Alert.alert(
                'Success',
                `Report status updated to ${newStatus}.`
              );
            } catch (error: any) {
              console.error('Status update error:', error);

              Alert.alert(
                'Update failed',
                error.message || 'Unable to update the report status.'
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Change report priority.
  const handlePriorityUpdate = async (newPriority: string) => {
    if (!report || updating) {
      return;
    }

    if (report.priority === newPriority) {
      Alert.alert(
        'No change',
        `This report is already marked as ${newPriority} priority.`
      );
      return;
    }

    Alert.alert(
      'Update Report Priority',
      `Are you sure you want to set the priority to "${newPriority}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: async () => {
            try {
              setUpdating(true);

              const reportRef = doc(db, 'reports', report.id);

              await updateDoc(reportRef, {
                priority: newPriority,
              });

              setReport((previous) =>
                previous
                  ? { ...previous, priority: newPriority }
                  : previous
              );

              Alert.alert(
                'Success',
                `Report priority updated to ${newPriority}.`
              );
            } catch (error: any) {
              console.error('Priority update error:', error);

              Alert.alert(
                'Update failed',
                error.message || 'Unable to update report priority.'
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

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

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'High':
        return styles.highPriorityBadge;
      case 'Medium':
        return styles.mediumPriorityBadge;
      case 'Low':
        return styles.lowPriorityBadge;
      default:
        return styles.unassignedPriorityBadge;
    }
  };

  const hasValidCoordinates =
    typeof report?.latitude === 'number' &&
    Number.isFinite(report.latitude) &&
    typeof report?.longitude === 'number' &&
    Number.isFinite(report.longitude);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />

        <Text style={styles.loadingText}>
          Loading report details...
        </Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>
          Report not found
        </Text>

        <Text style={styles.errorText}>
          This report may have been deleted or is unavailable.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backIconButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Report Details
          </Text>

          <Text style={styles.headerSubtitle}>
            Administrator View
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Report Image */}
        {report.imageUrl ? (
          <Image
            source={{ uri: report.imageUrl }}
            style={styles.reportImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageIcon}>📷</Text>

            <Text style={styles.noImageText}>
              No image uploaded for this report
            </Text>
          </View>
        )}

        {/* Title, Status, and Priority */}
        <View style={styles.mainCard}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.reportTitle}>
                {report.title || 'Untitled Report'}
              </Text>

              <Text style={styles.categoryText}>
                {report.category || 'Uncategorized'}
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

          {/* Current Priority */}
          <View
            style={[
              styles.priorityBadge,
              getPriorityStyle(report.priority),
            ]}
          >
            <Text style={styles.priorityBadgeText}>
              {report.priority || 'Not assigned'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>
            Description
          </Text>

          <Text style={styles.descriptionText}>
            {report.description || 'No description provided.'}
          </Text>

          <View style={styles.divider} />

          {/* Location */}
          <Text style={styles.sectionTitle}>
            Location
          </Text>

          <Text style={styles.infoText}>
            📍 {report.location || 'Location not provided'}
          </Text>

          {hasValidCoordinates && (
            <>
              <Text style={styles.coordinatesText}>
                Latitude: {report.latitude}
              </Text>

              <Text style={styles.coordinatesText}>
                Longitude: {report.longitude}
              </Text>

              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: report.latitude!,
                  longitude: report.longitude!,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={true}
                zoomEnabled={true}
              >
                <Marker
                  coordinate={{
                    latitude: report.latitude!,
                    longitude: report.longitude!,
                  }}
                  title={report.title || 'Reported Issue'}
                  description={report.location || 'Report location'}
                />
              </MapView>
            </>
          )}

          <View style={styles.divider} />

          {/* Citizen Information */}
          <Text style={styles.sectionTitle}>
            Submitted By
          </Text>

          <Text style={styles.infoText}>
            {report.userEmail || 'Email not available'}
          </Text>

          <View style={styles.divider} />

          {/* Date and Report ID */}
          <Text style={styles.sectionTitle}>
            Submission Date
          </Text>

          <Text style={styles.infoText}>
            {formatDate(report.timestamp)}
          </Text>

          <Text style={[styles.sectionTitle, styles.reportIdTitle]}>
            Report ID
          </Text>

          <Text style={styles.reportIdText}>
            {report.id}
          </Text>
        </View>

        {/* Priority Management */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>
            Manage Report Priority
          </Text>

          <Text style={styles.statusCardSubtitle}>
            Set the urgency level of this reported issue.
          </Text>

          {PRIORITY_OPTIONS.map((priority) => {
            const isSelected = report.priority === priority;

            return (
              <Pressable
                key={priority}
                style={[
                  styles.statusOption,
                  isSelected && styles.selectedStatusOption,
                  isSelected &&
                    priority === 'Low' &&
                    styles.selectedLowPriority,
                  isSelected &&
                    priority === 'Medium' &&
                    styles.selectedMediumPriority,
                  isSelected &&
                    priority === 'High' &&
                    styles.selectedHighPriority,
                  updating && styles.disabledButton,
                ]}
                disabled={updating || isSelected}
                onPress={() => handlePriorityUpdate(priority)}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    isSelected && styles.selectedStatusOptionText,
                  ]}
                >
                  {isSelected ? '✓  ' : ''}
                  {priority} Priority
                </Text>
              </Pressable>
            );
          })}

          {!report.priority && (
            <Text style={styles.priorityHint}>
              No priority has been assigned to this report yet.
            </Text>
          )}

          {updating && (
            <View style={styles.updatingContainer}>
              <ActivityIndicator color="#2563EB" />

              <Text style={styles.updatingText}>
                Updating report...
              </Text>
            </View>
          )}
        </View>

        {/* Status Management */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>
            Manage Report Status
          </Text>

          <Text style={styles.statusCardSubtitle}>
            Update the progress of this reported issue.
          </Text>

          {STATUS_OPTIONS.map((status) => {
            const isSelected = report.status === status;

            return (
              <Pressable
                key={status}
                style={[
                  styles.statusOption,
                  isSelected && styles.selectedStatusOption,
                  isSelected &&
                    status === 'Pending' &&
                    styles.selectedPending,
                  isSelected &&
                    status === 'In Progress' &&
                    styles.selectedProgress,
                  isSelected &&
                    status === 'Resolved' &&
                    styles.selectedResolved,
                  updating && styles.disabledButton,
                ]}
                disabled={updating || isSelected}
                onPress={() => handleStatusUpdate(status)}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    isSelected && styles.selectedStatusOptionText,
                  ]}
                >
                  {isSelected ? '✓  ' : ''}
                  {status}
                </Text>
              </Pressable>
            );
          })}

          {updating && (
            <View style={styles.updatingContainer}>
              <ActivityIndicator color="#2563EB" />

              <Text style={styles.updatingText}>
                Updating report...
              </Text>
            </View>
          )}
        </View>

        {/* Back to Dashboard */}
        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace('/(admin)')}
        >
          <Text style={styles.dashboardButtonText}>
            Back to Admin Dashboard
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },

  centerContainer: {
    flex: 1,
    backgroundColor: '#F3F6FB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1E293B',
  },

  errorText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAF2',
  },

  backIconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  backIcon: {
    color: '#2563EB',
    fontSize: 32,
    lineHeight: 35,
    fontWeight: '500',
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#172554',
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 35,
  },

  reportImage: {
    width: '100%',
    height: 220,
    borderRadius: 17,
    marginBottom: 16,
    backgroundColor: '#E2E8F0',
  },

  noImageContainer: {
    height: 150,
    backgroundColor: '#E2E8F0',
    borderRadius: 17,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noImageIcon: {
    fontSize: 35,
    marginBottom: 8,
  },

  noImageText: {
    color: '#64748B',
    fontSize: 13,
  },

  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 19,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },

  titleContainer: {
    flex: 1,
  },

  reportTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#172554',
    marginBottom: 7,
  },

  categoryText: {
    fontSize: 13,
    color: '#64748B',
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
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
    fontWeight: '800',
    color: '#334155',
  },

  priorityBadge: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
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

  unassignedPriorityBadge: {
    backgroundColor: '#E2E8F0',
  },

  divider: {
    height: 1,
    backgroundColor: '#E9EEF5',
    marginVertical: 17,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 9,
  },

  descriptionText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
  },

  infoText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },

  coordinatesText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },

  map: {
    width: '100%',
    height: 190,
    borderRadius: 13,
    marginTop: 13,
  },

  reportIdTitle: {
    marginTop: 17,
  },

  reportIdText: {
    color: '#64748B',
    fontSize: 12,
  },

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 19,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
  },

  statusCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#172554',
  },

  statusCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
    marginBottom: 15,
    lineHeight: 19,
  },

  statusOption: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 11,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },

  selectedStatusOption: {
    borderWidth: 1.5,
  },

  selectedPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },

  selectedProgress: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },

  selectedResolved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },

  selectedLowPriority: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },

  selectedMediumPriority: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },

  selectedHighPriority: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },

  statusOptionText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  selectedStatusOptionText: {
    color: '#1E293B',
  },

  priorityHint: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },

  disabledButton: {
    opacity: 0.6,
  },

  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 9,
  },

  updatingText: {
    color: '#64748B',
    fontSize: 13,
  },

  dashboardButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },

  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  backButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
