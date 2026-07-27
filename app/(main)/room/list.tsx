import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useRoomStore } from '../../../src/stores/roomStore';
import { supabase } from '../../../src/lib/supabase';

export default function RoomListScreen() {
  const { rooms, currentRoomId, loading, setCurrentRoom } = useRoomStore();
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (rooms.length === 0) {
      setMemberCounts({});
      return;
    }
    let cancelled = false;
    supabase
      .from('room_members')
      .select('room_id')
      .in('room_id', rooms.map((r) => r.id))
      .then(({ data }) => {
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const m of data ?? []) {
          counts[m.room_id] = (counts[m.room_id] ?? 0) + 1;
        }
        setMemberCounts(counts);
      });
    return () => { cancelled = true; };
  }, [rooms]);

  if (loading && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TouchableOpacity style={styles.createBtn} onPress={() => router.replace('/(main)/room/create')}>
            <Text style={styles.createBtnText}>+ 新しいルームを作成</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, item.id === currentRoomId && styles.activeRow]}
            onPress={() => { setCurrentRoom(item.id); router.back(); }}
          >
            <View>
              <Text style={styles.roomName}>{item.name}</Text>
              <Text style={styles.memberCount}>{memberCounts[item.id] ?? 0}人</Text>
            </View>
            {item.id === currentRoomId && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.joinBtn} onPress={() => router.replace('/(main)/room/join')}>
            <Text style={styles.joinBtnText}>招待URLで参加</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  createBtn: { margin: 16, padding: 14, backgroundColor: '#222', borderRadius: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  activeRow: { backgroundColor: '#f8f8f8' },
  roomName: { fontSize: 16 },
  memberCount: { fontSize: 13, color: '#888', marginTop: 2 },
  check: { color: '#4285F4', fontWeight: '700', fontSize: 18 },
  spinner: { flex: 1, justifyContent: 'center' },
  joinBtn: { margin: 16, padding: 14, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center' },
  joinBtnText: { color: '#555', fontWeight: '500', fontSize: 15 },
});
