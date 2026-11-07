import AsyncStorage from '@react-native-async-storage/async-storage';
import { AndroidImportance, getExpoPushTokenAsync, requestPermissionsAsync, setNotificationChannelAsync, setNotificationHandler } from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchApi } from './api';

if (Platform.OS !== 'web') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const tokenKey = '@booran_push_token';
export const readPushRegistration = () => AsyncStorage.getItem(tokenKey);

export async function enablePush() {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId || Platform.OS === 'web') throw new Error('Push requires a Booran iOS or Android build with an EAS project configured.');
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync('booran-alerts', { name: 'Booran sales alerts', importance: AndroidImportance.HIGH });
  }
  const permission = await requestPermissionsAsync();
  if (!permission.granted) throw new Error('Allow notifications in device settings to enable sales alerts.');
  const { data: token } = await getExpoPushTokenAsync({ projectId });
  await fetchApi('/push-devices', { method: 'POST', body: JSON.stringify({ token }) });
  await AsyncStorage.setItem(tokenKey, token);
}

export async function disablePush() {
  const token = await readPushRegistration();
  if (!token) return;
  await fetchApi('/push-devices', { method: 'DELETE', body: JSON.stringify({ token }) });
  await AsyncStorage.removeItem(tokenKey);
}
