import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';

export default function ProfileScreen() {
  const { session, profile, setProfile } = useAuthStore();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  const saveProfile = async () => {
    if (!session) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, display_name: name, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) Alert.alert('エラー', error.message);
    else setProfile(data);
    setSaving(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>プロフィール</Text>

      <View style={styles.avatarRow}>
        <Image
          source={{ uri: profile?.avatar_url ?? `https://api.dicebear.com/8.x/thumbs/svg?seed=${session?.user.id}` }}
          style={styles.avatar}
        />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>表示名</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="名前を入力"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? '保存中...' : '保存'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>ログアウト</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  avatarRow: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#eee' },
  form: { gap: 12 },
  label: { fontSize: 14, color: '#555', fontWeight: '500' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 8,
    height: 48,
    backgroundColor: '#222',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoutBtn: { marginTop: 'auto', alignItems: 'center', paddingVertical: 16 },
  logoutText: { color: '#e44', fontSize: 16 },
});
