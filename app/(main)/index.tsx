import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useRoomStore } from '../../src/stores/roomStore';
import type { Database } from '../../src/types/database';

type Media = Database['public']['Tables']['media']['Row'];

const COL = 3;
const GAP = 2;
const ITEM_SIZE = (Dimensions.get('window').width - GAP * (COL - 1)) / COL;
const PAGE_SIZE = 60;

export default function TimelineScreen() {
  const session = useAuthStore((s) => s.session);
  const { rooms, currentRoomId, setCurrentRoom } = useRoomStore();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchGenRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const fetchMedia = useCallback(async () => {
    const generation = ++fetchGenRef.current;
    if (!currentRoomId) {
      setMedia([]);
      setHasMore(true);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('room_id', currentRoomId)
      .order('uploaded_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (generation !== fetchGenRef.current) return;
    if (error) {
      setError(error.message);
    } else {
      const page = data ?? [];
      setMedia(page);
      setHasMore(page.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [currentRoomId]);

  const loadMore = useCallback(async () => {
    if (!currentRoomId || loading || loadingMoreRef.current || !hasMore) return;
    const generation = fetchGenRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const from = media.length;
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('room_id', currentRoomId)
      .order('uploaded_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (generation === fetchGenRef.current && !error) {
      const page = data ?? [];
      setMedia((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...prev, ...page.filter((m) => !existingIds.has(m.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [currentRoomId, loading, hasMore, media.length]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  useEffect(() => {
    if (!currentRoomId) return;
    const channel = supabase
      .channel(`media-room-${currentRoomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media', filter: `room_id=eq.${currentRoomId}` },
        (payload) => {
          const newItem = payload.new as Media;
          setMedia((prev) => (prev.some((m) => m.id === newItem.id) ? prev : [newItem, ...prev]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoomId]);

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
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>読み込みに失敗しました</Text>
          <TouchableOpacity onPress={fetchMedia}>
            <Text style={styles.inviteBtn}>再試行</Text>
          </TouchableOpacity>
        </View>
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
                allowDownscaling
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.id}
              />
            </TouchableOpacity>
          )}
          columnWrapperStyle={{ gap: GAP }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerSpinner} /> : null}
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
  footerSpinner: { marginVertical: 16 },
});
