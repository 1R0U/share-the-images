import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useRoomStore } from '../../../src/stores/roomStore';

const COL = 3;
const GAP = 2;
const ITEM_SIZE = (Dimensions.get('window').width - GAP * (COL - 1)) / COL;

export default function AlbumMonthScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const currentRoomId = useRoomStore((s) => s.currentRoomId);
  const [media, setMedia] = useState<any[]>([]);

  useEffect(() => {
    if (!currentRoomId || !month) return;
    supabase
      .from('media')
      .select('*')
      .eq('room_id', currentRoomId)
      .gte('uploaded_at', `${month}-01`)
      .lt('uploaded_at', nextMonth(month))
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => setMedia(data ?? []));
  }, [currentRoomId, month]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>{month}</Text>
      <FlatList
        data={media}
        keyExtractor={(item) => item.id}
        numColumns={COL}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(main)/room/media?id=${item.id}`)}>
            <Image source={{ uri: item.r2_url }} style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: GAP / 2 }} />
          </TouchableOpacity>
        )}
        columnWrapperStyle={{ gap: GAP }}
      />
    </SafeAreaView>
  );
}

function nextMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', padding: 16 },
});
