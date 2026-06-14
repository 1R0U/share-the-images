import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { useRoomStore } from '../../../src/stores/roomStore';

export default function InviteScreen() {
  const session = useAuthStore((s) => s.session);
  const { currentRoomId, rooms } = useRoomStore();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const inviteUrl = code ? `sharetheimages://join?code=${code}` : null;

  useEffect(() => {
    generateInvite();
  }, [currentRoomId]);

  const generateInvite = async () => {
    if (!session || !currentRoomId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('room_invites')
      .insert({
        room_id: currentRoomId,
        created_by: session.user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('code')
      .single();

    if (error) Alert.alert('エラー', error.message);
    else setCode(data.code);
    setLoading(false);
  };

  const shareUrl = async () => {
    if (!inviteUrl) return;
    await Share.share({ message: `「${currentRoom?.name}」に招待します！\n${inviteUrl}` });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>招待リンク</Text>
      <Text style={styles.sub}>{currentRoom?.name}</Text>

      {loading ? (
        <Text style={styles.loading}>生成中...</Text>
      ) : (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>招待コード</Text>
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.expiry}>7日間有効</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={shareUrl} disabled={loading}>
          <Text style={styles.btnText}>🔗 URLを共有</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={generateInvite} disabled={loading}>
          <Text style={[styles.btnText, styles.btnTextSecondary]}>↻ 新しいリンクを発行</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#888', marginBottom: 32 },
  loading: { textAlign: 'center', color: '#aaa', marginTop: 48 },
  codeBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  code: { fontSize: 28, fontWeight: '700', letterSpacing: 4, color: '#222' },
  expiry: { fontSize: 13, color: '#aaa' },
  actions: { marginTop: 32, gap: 12 },
  btn: {
    height: 52,
    backgroundColor: '#222',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondary: { backgroundColor: '#f2f2f2' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnTextSecondary: { color: '#222' },
});
