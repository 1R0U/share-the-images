import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { useRoomStore } from '../../../src/stores/roomStore';

export default function JoinScreen() {
  const { code: paramCode } = useLocalSearchParams<{ code?: string }>();
  const session = useAuthStore((s) => s.session);
  const { addRoom, setCurrentRoom } = useRoomStore();
  const [code, setCode] = useState(paramCode ?? '');
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (!session || !code.trim()) return;
    setJoining(true);
    try {
      const { data: room, error } = await supabase
        .rpc('join_room_by_code', { invite_code: code.trim() });

      if (error) throw error;

      addRoom(room);
      setCurrentRoom(room.id);

      router.back(); router.back();
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>ルームに参加</Text>
      <Text style={styles.sub}>招待コードを入力してください</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="招待コード"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
      />

      <TouchableOpacity
        style={[styles.btn, (!code.trim() || joining) && styles.btnDisabled]}
        onPress={join}
        disabled={!code.trim() || joining}
      >
        <Text style={styles.btnText}>{joining ? '参加中...' : '参加する'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, gap: 16 },
  heading: { fontSize: 22, fontWeight: '700' },
  sub: { color: '#888', marginBottom: 8 },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  btn: {
    height: 52,
    backgroundColor: '#222',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
