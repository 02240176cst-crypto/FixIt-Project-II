
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
} from 'expo-router/ui';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useEffect, useState } from 'react';

import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/services/firebaseConfig';

import {
  AppNotification,
  listenToNotifications,
} from '@/services/notificationService';

function TabButton({
  emoji,
  label,
  isFocused,
  badgeCount = 0,
  ...props
}: any) {
  const { ref: _ref, ...pressableProps } = props;

  return (
    <Pressable
      {...pressableProps}
      style={[
        styles.tabButton,
        isFocused && styles.selectedTab,
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{emoji}</Text>

        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.label,
          isFocused && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const [notifications, setNotifications] =
    useState<AppNotification[]>([]);

  // Listen for authentication changes and notifications.
  useEffect(() => {
    let unsubscribeNotifications:
      | (() => void)
      | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        // Stop the previous notification listener.
        if (unsubscribeNotifications) {
          unsubscribeNotifications();
          unsubscribeNotifications = undefined;
        }

        // Clear notifications when the user changes.
        setNotifications([]);

        // Do not listen when nobody is logged in.
        if (!user) {
          return;
        }

        // Start listening to the authenticated user's notifications.
        unsubscribeNotifications = listenToNotifications(
          (items) => {
            setNotifications(items);
          },
          (error) => {
            console.error(
              'Notification listener error:',
              error
            );
          }
        );
      }
    );

    // Clean up listeners when the component unmounts.
    return () => {
      unsubscribeAuth();

      if (unsubscribeNotifications) {
        unsubscribeNotifications();
      }
    };
  }, []);

  // Calculate unread notifications.
  const unreadCount = notifications.filter(
    (item) => !item.isRead
  ).length;

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />

      <TabList asChild>
        <View style={styles.tabBar}>

          <TabTrigger
            name="home"
            href="/(tabs)"
            asChild
          >
            <TabButton
              emoji="🏠"
              label="Home"
            />
          </TabTrigger>

          <TabTrigger
            name="report"
            href="/(tabs)/report"
            asChild
          >
            <TabButton
              emoji="📝"
              label="Report"
            />
          </TabTrigger>

          <TabTrigger
            name="my-reports"
            href="/(tabs)/my-reports"
            asChild
          >
            <TabButton
              emoji="📋"
              label="My Reports"
            />
          </TabTrigger>

          <TabTrigger
            name="map"
            href="/(tabs)/map"
            asChild
          >
            <TabButton
              emoji="🗺️"
              label="Map"
            />
          </TabTrigger>

          <TabTrigger
            name="profile"
            href="/(tabs)/profile"
            asChild
          >
            <TabButton
              emoji="👤"
              label="Profile"
            />
          </TabTrigger>

        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 12,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 14,
    gap: 4,
  },

  selectedTab: {
    backgroundColor: '#DBEAFE',
  },

  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize: 19,
  },

  label: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },

  selectedLabel: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },

  badge: {
    position: 'absolute',
    top: -7,
    right: -11,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
