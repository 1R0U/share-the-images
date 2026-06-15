import { Stack } from 'expo-router';

export default function RoomLayout() {
  return (
    <Stack>
      <Stack.Screen name="list" options={{ title: 'ルーム一覧', presentation: 'modal' }} />
      <Stack.Screen name="create" options={{ title: '新しいルーム', presentation: 'modal' }} />
      <Stack.Screen name="invite" options={{ title: '招待', presentation: 'modal' }} />
      <Stack.Screen name="join" options={{ title: '参加', presentation: 'modal' }} />
      <Stack.Screen name="media" options={{ headerShown: false }} />
      <Stack.Screen name="album" options={{ title: '' }} />
    </Stack>
  );
}
