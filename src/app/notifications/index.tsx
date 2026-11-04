
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    AppNotification,
    listenToNotifications,
    markNotificationAsRead,
} from '@/services/notificationService';

export default function NotificationsScreen() {
  const [notifications, setNotifications] =
    useState<AppNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = listenToNotifications(
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const handleNotificationPress = async (
    notification: AppNotification
  ) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
      }

      if (notification.reportId) {
        router.push({
          pathname: '/report-details/[id]',
          params: { id: notification.reportId },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Unable to open notification.');
    }
  };

  const renderNotification = ({
    item,
  }: {
    item: AppNotification;
  }) => (
    <Pressable
      style={[
        styles.notificationCard,
        !item.isRead && styles.unreadCard,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🔔</Text>
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text style={styles.notificationTitle}>
            {item.title}
          </Text>

          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.message}>
          {item.message}
        </Text>

        <Text style={styles.status}>
          Status: {item.status}
        </Text>

        <Text style={styles.tapText}>
          Tap to view report
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Notifications</Text>

        <Text style={styles.subtitle}>
          Stay updated on your reported issues
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={styles.loader}
        />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>
            No notifications yet
          </Text>
          <Text style={styles.emptyMessage}>
            Updates about your reported issues will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 45,
    paddingBottom: 22,
  },
  backButton: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 18,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  loader: {
    marginTop: 50,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadCard: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    flex: 1,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginTop: 7,
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 8,
  },
  tapText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    margin: 20,
  },
});
