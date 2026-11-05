
import { auth } from '@/services/firebaseConfig';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

export default function SettingsScreen() {
  const email = auth.currentUser?.email;

  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');

  const colors = darkMode
    ? {
        background: '#0F172A',
        card: '#1E293B',
        heading: '#F1F5F9',
        text: '#E2E8F0',
        secondary: '#94A3B8',
        iconBg: '#334155',
        separator: '#334155',
        backBg: '#1E3A5F',
        accent: '#60A5FA',
      }
    : {
        background: '#F4F8FF',
        card: '#FFFFFF',
        heading: '#1E3A8A',
        text: '#1E3A8A',
        secondary: '#64748B',
        iconBg: '#DBEAFE',
        separator: '#E2E8F0',
        backBg: '#DBEAFE',
        accent: '#1D4ED8',
      };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please log in again.');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send a password reset link to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert(
                'Email Sent',
                'Please check your email for the password reset link.'
              );
            } catch (error) {
              console.error('Password reset error:', error);
              Alert.alert(
                'Error',
                'Unable to send the reset email. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleLocationSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Unable to Open Settings',
        'Please open your phone settings and manage FixIt location permissions manually.'
      );
    }
  };

  const handleLanguage = () => {
    Alert.alert(
      'Choose Language',
      'Select your preferred language.',
      [
        {
          text: 'English',
          onPress: () => setLanguage('English'),
        },
        {
          text: 'Dzongkha',
          onPress: () => setLanguage('Dzongkha'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About FixIt',
      'FixIt – Community Issue Reporting and Tracking System\n\nProject II\n\nReport. Track. Improve.'
    );
  };

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.heading}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your FixIt preferences
          </Text>
        </View>
      </View>

      {/* Appearance */}
      <Text style={styles.sectionTitle}>Appearance</Text>

      <View style={styles.card}>
        <View style={styles.option}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🌙</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Dark Mode</Text>
            <Text style={styles.optionSubtitle}>
              Switch between light and dark appearance
            </Text>
          </View>

          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{
              false: '#CBD5E1',
              true: '#2563EB',
            }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Language */}
      <Text style={styles.sectionTitle}>Language</Text>

      <View style={styles.card}>
        <Pressable
          style={styles.option}
          onPress={handleLanguage}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🌐</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>App Language</Text>
            <Text style={styles.optionSubtitle}>
              Choose your preferred language
            </Text>
          </View>

          <Text style={styles.selectedLanguage}>
            {language}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* Account Settings */}
      <Text style={styles.sectionTitle}>Account Settings</Text>

      <View style={styles.card}>
        <Pressable
          style={styles.option}
          onPress={handlePasswordReset}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Change Password
            </Text>
            <Text style={styles.optionSubtitle}>
              Receive an email to reset your password
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* Permissions */}
      <Text style={styles.sectionTitle}>Permissions</Text>

      <View style={styles.card}>
        <Pressable
          style={styles.option}
          onPress={handleLocationSettings}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📍</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Location Permissions
            </Text>
            <Text style={styles.optionSubtitle}>
              Manage location access for reporting issues
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>

      <View style={styles.card}>
        <Pressable
          style={styles.option}
          onPress={handleAbout}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>ℹ️</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>About FixIt</Text>
            <Text style={styles.optionSubtitle}>
              Learn more about the application
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <View style={styles.separator} />

        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>
            Application
          </Text>
          <Text style={styles.versionValue}>
            Project II
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        FixIt · Report. Track. Improve.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 22,
      paddingTop: 45,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 28,
    },
    backButton: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: colors.backBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 13,
    },
    backText: {
      fontSize: 32,
      color: colors.accent,
      marginTop: -5,
    },
    headerText: {
      flex: 1,
    },
    heading: {
      fontSize: 27,
      fontWeight: 'bold',
      color: colors.heading,
    },
    subtitle: {
      fontSize: 13,
      color: colors.secondary,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.heading,
      marginBottom: 12,
      marginTop: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 15,
      marginBottom: 22,
      elevation: 2,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 17,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.iconBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 13,
    },
    icon: {
      fontSize: 20,
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
    },
    optionSubtitle: {
      fontSize: 11,
      color: colors.secondary,
      marginTop: 5,
      lineHeight: 16,
    },
    arrow: {
      fontSize: 25,
      color: colors.secondary,
      marginLeft: 8,
    },
    selectedLanguage: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: '600',
    },
    separator: {
      height: 1,
      backgroundColor: colors.separator,
    },
    versionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    versionLabel: {
      fontSize: 13,
      color: colors.secondary,
    },
    versionValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    footer: {
      textAlign: 'center',
      color: colors.secondary,
      fontSize: 11,
      marginTop: 12,
    },
  });
