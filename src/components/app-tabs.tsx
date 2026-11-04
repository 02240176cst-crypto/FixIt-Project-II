
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

function TabButton({
  emoji,
  label,
  isFocused,
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
      <Text style={styles.emoji}>{emoji}</Text>
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
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />

      <TabList asChild>
        <View style={styles.tabBar}>
          <TabTrigger name="home" href="/(tabs)" asChild>
            <TabButton emoji="🏠" label="Home" />
          </TabTrigger>

          <TabTrigger name="report" href="/(tabs)/report" asChild>
            <TabButton emoji="📝" label="Report" />
          </TabTrigger>

          <TabTrigger name="my-reports" href="/(tabs)/my-reports" asChild>
            <TabButton emoji="📋" label="My Reports" />
          </TabTrigger>

          <TabTrigger name="map" href="/(tabs)/map" asChild>
            <TabButton emoji="🗺️" label="Map" />
          </TabTrigger>

          <TabTrigger name="profile" href="/(tabs)/profile" asChild>
            <TabButton emoji="👤" label="Profile" />
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
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
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
  emoji: {
    fontSize: 19,
  },
  label: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  selectedLabel: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },
});