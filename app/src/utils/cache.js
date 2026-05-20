import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveToCache(key, data) {
  try {
    const serialized = JSON.stringify(data);
    await AsyncStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    return false;
  }
}

export async function loadFromCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export async function clearCache(key) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

export async function clearAllCache() {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    return false;
  }
}
