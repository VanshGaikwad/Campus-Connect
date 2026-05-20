import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { auth, db } from '../../api/firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => auth.signOut(), style: "destructive" }
    ]);
  };

  if (loading) return (
    <View className="flex-1 justify-center items-center bg-slate-50">
      <ActivityIndicator size="large" color="#1e3a8a" />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="px-6 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER --- */}
        <View className="mb-6">
          <Text className="text-3xl font-black text-slate-900">My Profile</Text>
          <Text className="text-slate-500 font-medium">Digital Identity & Settings</Text>
        </View>

        {/* --- DIGITAL ID CARD --- */}
        <LinearGradient
          colors={['#1e3a8a', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[40px] p-6 shadow-2xl shadow-blue-300 mb-10 overflow-hidden"
        >
          {/* Subtle Glass Shine Decor */}
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          
          <View className="flex-row justify-between items-start mb-8">
            <View>
              <Text className="text-blue-100/80 text-[10px] font-black uppercase tracking-widest">
                Pune Institute of Computer Technology
              </Text>
              <Text className="text-white text-2xl font-black mt-1 leading-7">
                {userData?.name}
              </Text>
            </View>
            <View className="bg-white/20 p-2 rounded-xl">
              <Ionicons name="school" size={20} color="white" />
            </View>
          </View>

          <View className="flex-row justify-between items-end">
            <View>
              <View className="mb-3">
                <Text className="text-blue-200 text-[9px] font-bold uppercase">Department</Text>
                <Text className="text-white font-bold">{userData?.dept || 'N/A'}</Text>
              </View>
              <View>
                <Text className="text-blue-200 text-[9px] font-bold uppercase">PICT ID</Text>
                <Text className="text-white font-black tracking-widest">{userData?.pictId}</Text>
              </View>
            </View>

            {/* QR Code Container */}
            <View className="bg-white p-2 rounded-2xl border-4 border-white/20">
              <QRCode
                value={userData?.pictId || 'PICT'}
                size={70}
                color="#1e3a8a"
                backgroundColor="white"
              />
            </View>
          </View>
        </LinearGradient>

        {/* --- SETTINGS LIST --- */}
        <View className="bg-white rounded-[35px] p-2 shadow-sm border border-slate-100 mb-10">
          <SettingsItem icon="person-outline" label="Edit Profile" />
          <SettingsItem icon="calendar-outline" label="My Events" />
          <SettingsItem icon="notifications-outline" label="Notifications" />
          <SettingsItem icon="shield-checkmark-outline" label="Privacy Policy" />
          <SettingsItem 
            icon="log-out-outline" 
            label="Sign Out" 
            isDestructive 
            onPress={handleLogout} 
          />
        </View>

        <View className="items-center pb-10">
          <Text className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
            App Version 1.0.2 (Beta)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingsItem = ({ icon, label, isDestructive, onPress }) => (
  <TouchableOpacity 
    onPress={onPress}
    className="flex-row items-center justify-between p-5 border-b border-slate-50 last:border-b-0"
  >
    <View className="flex-row items-center">
      <View className={`p-2 rounded-xl ${isDestructive ? 'bg-rose-50' : 'bg-slate-50'}`}>
        <Ionicons name={icon} size={20} color={isDestructive ? '#e11d48' : '#64748b'} />
      </View>
      <Text className={`ml-4 font-bold ${isDestructive ? 'text-rose-600' : 'text-slate-700'}`}>
        {label}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
  </TouchableOpacity>
);