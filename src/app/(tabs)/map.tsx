
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import MapView, { Marker } from 'react-native-maps';

import {
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { auth, db } from '@/services/firebaseConfig';

type CommunityReport = {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  status: string;
  latitude: number;
  longitude: number;
};

type FilterStatus = 'All' | 'Pending' | 'In Progress' | 'Resolved';

const statusColors: Record<string, string> = {
  Pending: '#F59E0B',
  'In Progress': '#2563EB',
  Resolved: '#16A34A',
};

export default function MapScreen() {
  const [reports, setReports] = useState<CommunityReport[]>([]);

  const [selectedReport, setSelectedReport] =
    useState<CommunityReport | null>(null);

  const [selectedFilter, setSelectedFilter] =
    useState<FilterStatus>('All');

  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Listen for community reports from Firestore
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setError('Please log in to view the community map.');
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const reportList: CommunityReport[] = snapshot.docs
          .map((reportDoc) => {
            const data = reportDoc.data();

            return {
              id: reportDoc.id,
              title: data.title ?? 'Untitled issue',
              category: data.category ?? 'Other',
              description: data.description ?? '',
              location: data.location ?? '',
              status: data.status ?? 'Pending',
              latitude: data.latitude,
              longitude: data.longitude,
            };
          })
          .filter(
            (report) =>
              typeof report.latitude === 'number' &&
              Number.isFinite(report.latitude) &&
              report.latitude >= -90 &&
              report.latitude <= 90 &&
              typeof report.longitude === 'number' &&
              Number.isFinite(report.longitude) &&
              report.longitude >= -180 &&
              report.longitude <= 180
          );

        setReports(reportList);

        // Update selected report if Firestore data changes
        setSelectedReport((current) => {
          if (!current) return null;

          return (
            reportList.find((report) => report.id === current.id) ??
            null
          );
        });

        setError('');
        setLoading(false);
      },
      (err) => {
        console.log('Community map error:', err);
        setError(
          'Unable to load community reports. Please check your connection and Firestore rules.'
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Filter reports by status and search query
  const filteredReports = reports.filter((report) => {
    const matchesStatus =
      selectedFilter === 'All' ||
      report.status === selectedFilter;

    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      query === '' ||
      report.title.toLowerCase().includes(query) ||
      report.category.toLowerCase().includes(query) ||
      report.location.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  // Change filter and clear selected report
  const changeFilter = (filter: FilterStatus) => {
    setSelectedFilter(filter);
    setSelectedReport(null);
  };

  // Search reports
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setSelectedReport(null);
  };

  // Open full report details
  const openReportDetails = () => {
    if (!selectedReport) return;

    router.push({
      pathname: '/report-details/[id]',
      params: { id: selectedReport.id },
    });
  };

  // Report counts
  const pendingCount = reports.filter(
    (report) => report.status === 'Pending'
  ).length;

  const progressCount = reports.filter(
    (report) => report.status === 'In Progress'
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === 'Resolved'
  ).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          EXPLORE YOUR COMMUNITY
        </Text>

        <Text style={styles.title}>Community Map</Text>

        <Text style={styles.subtitle}>
          Explore and search reported community issues.
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search title, category or location..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearch('')}
            style={styles.clearSearchButton}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.legend}>
        {(
          ['All', 'Pending', 'In Progress', 'Resolved'] as const
        ).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter &&
                styles.activeFilterButton,
            ]}
            onPress={() => changeFilter(filter)}
            activeOpacity={0.8}
          >
            {filter !== 'All' && (
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: statusColors[filter] },
                ]}
              />
            )}

            <Text
              style={[
                styles.legendText,
                selectedFilter === filter &&
                  styles.activeFilterText,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Result Count */}
      <Text style={styles.resultText}>
        Showing {filteredReports.length} of {reports.length} mapped reports
      </Text>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 27.5,
            longitude: 90.5,
            latitudeDelta: 1.5,
            longitudeDelta: 1.5,
          }}
        >
          {filteredReports.map((report) => (
            <Marker
              key={report.id}
              coordinate={{
                latitude: report.latitude,
                longitude: report.longitude,
              }}
              pinColor={
                statusColors[report.status] ?? '#64748B'
              }
              title={report.title}
              description={`${report.category} • ${report.status}`}
              onPress={() => setSelectedReport(report)}
            />
          ))}
        </MapView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>
              Loading community reports...
            </Text>
          </View>
        )}

        {/* Error Overlay */}
        {!loading && error !== '' && (
          <View style={styles.messageOverlay}>
            <Text style={styles.messageIcon}>⚠️</Text>

            <Text style={styles.messageTitle}>
              Unable to load map
            </Text>

            <Text style={styles.messageText}>
              {error}
            </Text>
          </View>
        )}

        {/* Empty Map Message */}
        {!loading &&
          !error &&
          filteredReports.length === 0 && (
            <View style={styles.emptyOverlay}>
              <Text style={styles.emptyIcon}>📍</Text>

              <Text style={styles.emptyTitle}>
                {reports.length === 0
                  ? 'No Mapped Reports Yet'
                  : 'No Matching Reports'}
              </Text>

              <Text style={styles.emptyText}>
                {reports.length === 0
                  ? 'Community reports with saved locations will appear here.'
                  : 'Try another search term or change the status filter.'}
              </Text>

              {(searchQuery !== '' || selectedFilter !== 'All') && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('All');
                    setSelectedReport(null);
                  }}
                >
                  <Text style={styles.resetButtonText}>
                    Clear Search and Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        {/* Selected Report Card */}
        {selectedReport && (
          <View style={styles.reportCard}>
            <View style={styles.reportCardHeader}>
              <View style={styles.reportCardHeading}>
                <Text style={styles.reportCategory}>
                  {selectedReport.category}
                </Text>

                <Text style={styles.reportTitle}>
                  {selectedReport.title}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedReport(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reportLocationRow}>
              <Text style={styles.reportLocationIcon}>📍</Text>

              <Text style={styles.reportLocation}>
                {selectedReport.location ||
                  'Location not specified'}
              </Text>
            </View>

            <View style={styles.reportStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusColors[selectedReport.status] ??
                      '#64748B',
                  },
                ]}
              />

              <Text
                style={[
                  styles.reportStatus,
                  {
                    color:
                      statusColors[selectedReport.status] ??
                      '#64748B',
                  },
                ]}
              >
                {selectedReport.status}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.detailsButton}
              activeOpacity={0.85}
              onPress={openReportDetails}
            >
              <Text style={styles.detailsButtonText}>
                View Report Details →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Community Report Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>
          Community Issue Overview
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {reports.length}
            </Text>

            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryNumber,
                { color: statusColors.Pending },
              ]}
            >
              {pendingCount}
            </Text>

            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryNumber,
                { color: statusColors['In Progress'] },
              ]}
            >
              {progressCount}
            </Text>

            <Text style={styles.summaryLabel}>
              In Progress
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryNumber,
                { color: statusColors.Resolved },
              ]}
            >
              {resolvedCount}
            </Text>

            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 18,
    paddingTop: 35,
    paddingBottom: 12,
  },

  header: {
    marginBottom: 12,
  },

  eyebrow: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#1E3A8A',
  },

  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 5,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 45,
    marginBottom: 10,
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    color: '#173B78',
    fontSize: 12,
    height: '100%',
  },

  clearSearchButton: {
    padding: 7,
  },

  clearSearchText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 6,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    gap: 3,
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },

  activeFilterButton: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#2563EB',
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
  },

  legendText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
  },

  activeFilterText: {
    color: '#2563EB',
    fontWeight: '800',
  },

  resultText: {
    color: '#64748B',
    fontSize: 10,
    marginBottom: 7,
    marginLeft: 3,
  },

  mapContainer: {
    flex: 1,
    minHeight: 220,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E1EAF7',
    backgroundColor: '#EAF1FA',
  },

  map: {
    width: '100%',
    height: '100%',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 10,
  },

  messageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  messageIcon: {
    fontSize: 32,
    marginBottom: 10,
  },

  messageTitle: {
    color: '#1E3A8A',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 7,
  },

  messageText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
  },

  emptyOverlay: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  emptyTitle: {
    color: '#1E3A8A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },

  emptyText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
  },

  resetButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
    marginTop: 13,
  },

  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  reportCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#173B78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  reportCardHeading: {
    flex: 1,
  },

  reportCategory: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 5,
  },

  reportTitle: {
    color: '#173B78',
    fontSize: 16,
    fontWeight: '800',
  },

  closeButton: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  closeButtonText: {
    color: '#64748B',
    fontWeight: '800',
  },

  reportLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  reportLocationIcon: {
    fontSize: 13,
    marginRight: 6,
  },

  reportLocation: {
    flex: 1,
    color: '#64748B',
    fontSize: 11,
  },

  reportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  reportStatus: {
    fontSize: 11,
    fontWeight: '800',
  },

  detailsButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 13,
  },

  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E8EEF8',
  },

  summaryTitle: {
    color: '#173B78',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    color: '#173B78',
    fontSize: 19,
    fontWeight: '800',
  },

  summaryLabel: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 4,
  },

  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
});
