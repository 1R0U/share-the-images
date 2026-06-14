import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { session, isLoading, isGuest } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return session || isGuest ? (
    <Redirect href="/(main)" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
