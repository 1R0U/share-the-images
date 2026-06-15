import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useRoomStore } from '../../src/stores/roomStore';

const COL = 3;
const GAP = 2;
const ITEM_SIZE = (Dimensions.get('window').width - GAP * (COL - 1)) / COL;

export default function SearchScreen() {
  const currentRoomId = useRoomStore((s) => s.currentRoomId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const search = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim() || !currentRoomId) { setResults([]); return; }

    const { data } = await supabase
      .from('media_tags')
      .select('media_id, media(*)')
      .eq('media.room_id', currentRoomId)
      .ilike('tags.name', `%${text}%`)
      .limit(60);

    setResults(data?.flatMap((d) => d.media ?? []) ?? []);
  }, [currentRoomId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="タグで検索..."
          value={query}
          onChangeText={search}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{query ? '見つかりませんでした' : 'タグを入力して検索'}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/(main)/room/media?id=${item.id}`)}>
              <Image source={{ uri: item.r2_url }} style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: GAP / 2 }} />
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
  searchBar: { padding: 12 },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 16,
    fontSize: 16,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
});
