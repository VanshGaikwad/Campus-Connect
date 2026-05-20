import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import HomeTab from '../tabs/HomeTab';
import EventTab from '../tabs/EventTab';
import NoticeTab from '../tabs/NoticeTab';
import TnpTab from '../tabs/TnpTab';
const Tab = createBottomTabNavigator();

const iconMap = {
  Home: 'home',
  TNP: 'briefcase',
  Notice: 'notifications',
  Events: 'calendar',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: '#e2e8f0',
          backgroundColor: '#ffffff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={iconMap[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeTab} />
      <Tab.Screen name="TNP" component={TnpTab} />
      <Tab.Screen name="Notice" component={NoticeTab} />
      <Tab.Screen name="Events" component={EventTab} />
    </Tab.Navigator>
  );
}
