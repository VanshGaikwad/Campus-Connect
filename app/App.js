import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupNotificationListeners } from './src/services/notificationService';
import { subscribeToTopics } from './src/services/subscriptionService';
import {
  seedContentNotificationState,
  startContentNotificationPolling,
  stopContentNotificationPolling,
} from './src/services/contentNotificationPoller';
import {
  dismissExpiredNotifications,
  startNotificationGuardian,
  stopNotificationGuardian,
} from './src/services/NotificationManager';

// ── Inner component that consumes AuthContext ──────────
function AppInner() {
  const { user, profile, loading } = useAuth();
  const notificationListeners = useRef(null);
  const navigationRef = useRef(null);
  const pendingNotificationDataRef = useRef(null);
  const navReadyRef = useRef(false);

  // ── Notification setup (runs when user logs in) ──────
  useEffect(() => {
    if (!user || !profile) return;

    let isMounted = true;

    const initNotifications = async () => {
      try {
        // 1. Set up notification listeners
        notificationListeners.current = setupNotificationListeners(
          (notification) => {
            console.log('[App] Notification received:', notification.request.content.title);
          },
          (response) => {
            console.log('[App] Notification tapped:', response.notification.request.content.data);
            
            // Handle notification tap — navigate to the appropriate screen
            const data = response.notification.request.content.data || {};
            handleNotificationTap(data);
          },
        );

        // 2. Register push token and subscribe to topics
        if (isMounted) {
          await subscribeToTopics(profile);
          await seedContentNotificationState();
          startContentNotificationPolling();
        }

        // 3. Handle cold-start notification tap when app was killed
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        const lastData = lastResponse?.notification?.request?.content?.data;
        if (lastData && isMounted) {
          handleNotificationTap(lastData);
        }
      } catch (error) {
        console.error('[App] Notification init failed:', error);
      }
    };

    initNotifications();

    return () => {
      isMounted = false;
      if (notificationListeners.current) {
        notificationListeners.current.remove();
      }
      stopContentNotificationPolling();
    };
  }, [user, profile]);

  // ── Handle notification tap and navigate to appropriate screen ──
  const handleNotificationTap = (data) => {
    if (!navigationRef.current || !navReadyRef.current) {
      pendingNotificationDataRef.current = data;
      return;
    }

    const screenName = data.screenName;
    if (!screenName) {
      console.warn('[App] No screenName in notification data');
      return;
    }

    // Navigate to the appropriate screen with the notification data as params
    navigationRef.current.navigate(screenName, { 
      notificationData: data 
    });
  };

  const handleNavigationReady = () => {
    navReadyRef.current = true;
    if (pendingNotificationDataRef.current) {
      const data = pendingNotificationDataRef.current;
      pendingNotificationDataRef.current = null;
      handleNotificationTap(data);
    }
  };

  // ── Notification Guardian ──────────────────────────────
  // Polls every 10s to show an ongoing (non-swipable) notification
  // with live countdown, a 5-min popup, and auto-dismiss at lecture start.
  useEffect(() => {
    dismissExpiredNotifications();
    startNotificationGuardian();
    startContentNotificationPolling();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        dismissExpiredNotifications();
        startNotificationGuardian();
        startContentNotificationPolling();
      } else {
        stopNotificationGuardian();
        stopContentNotificationPolling();
      }
    });

    return () => {
      subscription.remove();
      stopNotificationGuardian();
      stopContentNotificationPolling();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3D6EE8" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
      <AppNavigator />
    </NavigationContainer>
  );
}

// ── Root App ───────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
