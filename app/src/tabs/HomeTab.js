import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import StudentHomeTab from './StudentHomeTab';
import FacultyHomeTab from './Facultyhometab';

export default function HomeTab({ navigation }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3D6EE8" />
      </View>
    );
  }

  return role === 'faculty'
    ? <FacultyHomeTab navigation={navigation} />
    : <StudentHomeTab navigation={navigation} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});