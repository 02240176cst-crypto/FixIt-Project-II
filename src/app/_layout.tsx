
import { Stack, router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  Image,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';

import { auth, db } from '@/services/firebaseConfig';

export default function RootLayout() {
  const [destination, setDestination] = useState<string | null>(null);
  const [minimumTimePassed, setMinimumTimePassed] = useState(false);

  // Keep splash screen visible for at least 3 seconds.
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumTimePassed(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Listen for Firebase authentication changes.
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (!user) {
        setDestination('/(auth)/login');
        return;
      }

      try {
        // Get the user's role from Firestore.
        const userRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!isMounted) return;

        const role = userSnapshot.exists()
          ? userSnapshot.data().role
          : 'citizen';

        if (role === 'admin') {
          setDestination('/(admin)');
        } else {
          setDestination('/(tabs)');
        }

      } catch (error) {
        console.error('Unable to verify user role:', error);

        if (isMounted) {
          setDestination('/(tabs)');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Navigate whenever the destination changes.
  useEffect(() => {
    if (minimumTimePassed && destination) {
      router.replace(destination as any);
    }
  }, [minimumTimePassed, destination]);

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
      </Stack>

      {(!minimumTimePassed || !destination) && (
        <View style={styles.splashContainer}>
          <StatusBar hidden />

          <Image
            source={require('../../assets/images/fixit-splash.png')}
            style={styles.splashImage}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9FF',
  },

  splashContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F4F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  splashImage: {
    width: '100%',
    height: '100%',
  },
});
