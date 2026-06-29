import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';

export default function RootLayout() {
  const { setSession, setProfile, setLoading, clear } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(data ?? null);
        }

        if (event === 'SIGNED_IN') router.replace('/(main)');
        if (event === 'SIGNED_OUT') {
          clear();
          router.replace('/(auth)/login');
        }
        if (event === 'INITIAL_SESSION') setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
