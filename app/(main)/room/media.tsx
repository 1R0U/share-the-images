import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import type { Database } from '../../../src/types/database';

type Comment = Database['public']['Tables']['comments']['Row'] & { profiles: { display_name: string } | null };
type Reaction = Database['public']['Tables']['reactions']['Row'];

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const [media, setMedia] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.from('media').select('*').eq('id', id).single().then(({ data }) => setMedia(data));
    supabase.from('comments').select('*, profiles(display_name)').eq('media_id', id).order('created_at').then(({ data }) => setComments(data ?? []));
    supabase.from('reactions').select('*').eq('media_id', id).then(({ data }) => setReactions(data ?? []));
  }, [id]);

  const addReaction = async (emoji: string) => {
    if (!session || !id) return;
    await supabase.from('reactions').upsert({ media_id: id, user_id: session.user.id, emoji });
    const { data } = await supabase.from('reactions').select('*').eq('media_id', id);
    setReactions(data ?? []);
  };

  const postComment = async () => {
    if (!session || !id || !commentText.trim()) return;
    await supabase.from('comments').insert({ media_id: id, user_id: session.user.id, body: commentText.trim() });
    setCommentText('');
    const { data } = await supabase.from('comments').select('*, profiles(display_name)').eq('media_id', id).order('created_at');
    setComments(data ?? []);
  };

  if (!media) return null;

  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>

        <Image source={{ uri: media.r2_url }} style={styles.image} resizeMode="contain" />

        <View style={styles.reactions}>
          {['❤️', '😂', '😮', '👏', '🔥'].map((emoji) => (
            <TouchableOpacity key={emoji} style={styles.reactionBtn} onPress={() => addReaction(emoji)}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {reactionCounts[emoji] ? <Text style={styles.reactionCount}>{reactionCounts[emoji]}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          style={styles.commentList}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <Text style={styles.commenterName}>{item.profiles?.display_name ?? '?'}</Text>
              <Text style={styles.commentBody}>{item.body}</Text>
            </View>
          )}
        />

        <View style={styles.commentInput}>
          <TextInput
            style={styles.textInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="コメントを追加..."
            returnKeyType="send"
            onSubmitEditing={postComment}
          />
          <TouchableOpacity onPress={postComment} disabled={!commentText.trim()}>
            <Text style={styles.sendBtn}>送信</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  back: { padding: 16 },
  backText: { color: '#fff', fontSize: 16 },
  image: { width: '100%', height: 360, backgroundColor: '#111' },
  reactions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#111',
  },
  reactionBtn: { alignItems: 'center', padding: 8, backgroundColor: '#222', borderRadius: 24 },
  reactionEmoji: { fontSize: 22 },
  reactionCount: { color: '#fff', fontSize: 11, marginTop: 2 },
  commentList: { flex: 1, backgroundColor: '#fff', padding: 12 },
  commentRow: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  commenterName: { fontSize: 13, fontWeight: '600', color: '#333' },
  commentBody: { fontSize: 15, color: '#111', marginTop: 2 },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    gap: 12,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  sendBtn: { color: '#4285F4', fontWeight: '600', fontSize: 15 },
});
