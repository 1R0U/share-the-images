import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useRoomStore } from '../../src/stores/roomStore';
import { supabase } from '../../src/lib/supabase';
import { Text } from 'react-native';

export default function MainLayout() {
  const { session, isGuest, isLoading } = useAuthStore();
  const { setRooms } = useRoomStore();

  useEffect(() => {
    if (!session) return;

    supabase
      .from('room_members')
      .select('room_id, rooms(*)')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        const rooms = data?.flatMap((m) => m.rooms ?? []) ?? [];
        setRooms(rooms as any);
      });
  }, [session, setRooms]);

  if (isLoading) return null;
  if (!session && !isGuest) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopColor: '#eee' },
        tabBarActiveTintColor: '#222',
        tabBarInactiveTintColor: '#aaa',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'タイムライン',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '検索',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 28 }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: 'アルバム',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🗂️</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>👤</Text>,
        }}
      />
      <Tabs.Screen name="room" options={{ href: null }} />
    </Tabs>
  );
}
