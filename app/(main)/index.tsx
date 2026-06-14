import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useRoomStore } from '../../src/stores/roomStore';
import type { Database } from '../../src/types/database';

type Media = Database['public']['Tables']['media']['Row'];

const COL = 3;
const GAP = 2;
const ITEM_SIZE = (Dimensions.get('window').width - GAP * (COL - 1)) / COL;

export default function TimelineScreen() {
  const session = useAuthStore((s) => s.session);
  const { rooms, currentRoomId, setCurrentRoom } = useRoomStore();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMedia = useCallback(async () => {
    if (!currentRoomId) return;
    setLoading(true);
    const { data } = await supabase
      .from('media')
      .select('*')
      .eq('room_id', currentRoomId)
      .order('uploaded_at', { ascending: false })
      .limit(60);
    setMedia(data ?? []);
    setLoading(false);
  }, [currentRoomId]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const currentRoom = rooms.find((r) => r.id === currentRoomId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Room switcher */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(main)/room/list')}>
          <Text style={styles.roomName}>{currentRoom?.name ?? 'ルームを選択'} ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(main)/room/invite')}>
          <Text style={styles.inviteBtn}>招待</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : media.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>まだ写真がありません</Text>
          <Text style={styles.emptyHint}>カメラタブから最初の1枚を投稿しよう</Text>
        </View>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(main)/room/media?id=${item.id}`)}
            >
              <Image
                source={{ uri: item.r2_url }}
                style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: GAP / 2 }}
              />
            </TouchableOpacity>
          )}
          columnWrapperStyle={{ gap: GAP }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  roomName: { fontSize: 17, fontWeight: '600' },
  inviteBtn: { fontSize: 15, color: '#4285F4', fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#333' },
  emptyHint: { fontSize: 14, color: '#888' },
});
