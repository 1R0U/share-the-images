import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { Redirect } from 'expo-router';

export default function AuthLayout() {
  const { session, isGuest } = useAuthStore();

  if (session || isGuest) return <Redirect href="/(main)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
