import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useRoomStore } from '../../src/stores/roomStore';
import { router } from 'expo-router';

interface MonthGroup {
  month: string;
  cover: string;
  count: number;
}

export default function AlbumsScreen() {
  const currentRoomId = useRoomStore((s) => s.currentRoomId);
  const [months, setMonths] = useState<MonthGroup[]>([]);

  useEffect(() => {
    if (!currentRoomId) return;
    supabase
      .from('media')
      .select('id, r2_url, uploaded_at')
      .eq('room_id', currentRoomId)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, MonthGroup> = {};
        for (const item of data) {
          const month = item.uploaded_at.slice(0, 7);
          if (!map[month]) map[month] = { month, cover: item.r2_url, count: 0 };
          map[month].count++;
        }
        setMonths(Object.values(map));
      });
  }, [currentRoomId]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>アルバム</Text>
      <FlatList
        data={months}
        keyExtractor={(item) => item.month}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(main)/room/album?month=${item.month}`)}
          >
            <Image source={{ uri: item.cover }} style={styles.cover} />
            <Text style={styles.monthLabel}>{item.month}</Text>
            <Text style={styles.count}>{item.count}枚</Text>
          </TouchableOpacity>
        )}
        columnWrapperStyle={{ gap: 8 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', padding: 16 },
  card: { flex: 1, margin: 4 },
  cover: { width: '100%', aspectRatio: 1, borderRadius: 12 },
  monthLabel: { marginTop: 6, fontWeight: '600', fontSize: 15 },
  count: { color: '#888', fontSize: 13 },
});
