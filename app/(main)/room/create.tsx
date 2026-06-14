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
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { useRoomStore } from '../../../src/stores/roomStore';

export default function CreateRoomScreen() {
  const session = useAuthStore((s) => s.session);
  const { addRoom, setCurrentRoom } = useRoomStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!session || !name.trim()) return;
    setCreating(true);
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ name: name.trim(), description: description.trim() || null, owner_id: session.user.id })
        .select()
        .single();

      if (roomError) throw roomError;

      await supabase.from('room_members').insert({ room_id: room.id, user_id: session.user.id, role: 'owner' });

      addRoom(room);
      setCurrentRoom(room.id);
      router.back();
      router.back();
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>ルーム名 *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: 家族の思い出"
          maxLength={50}
        />

        <Text style={styles.label}>説明（任意）</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="ルームの説明..."
          multiline
          numberOfLines={3}
          maxLength={200}
        />

        <TouchableOpacity
          style={[styles.btn, (!name.trim() || creating) && styles.btnDisabled]}
          onPress={create}
          disabled={!name.trim() || creating}
        >
          <Text style={styles.btnText}>{creating ? '作成中...' : 'ルームを作成'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  form: { gap: 12 },
  label: { fontSize: 14, color: '#555', fontWeight: '500', marginTop: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  multiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  btn: {
    marginTop: 16,
    height: 52,
    backgroundColor: '#222',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
