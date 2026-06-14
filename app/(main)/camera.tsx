import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useRoomStore } from '../../src/stores/roomStore';

export default function CameraScreen() {
  const session = useAuthStore((s) => s.session);
  const currentRoomId = useRoomStore((s) => s.currentRoomId);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async (useCamera: boolean) => {
    if (!session || !currentRoomId) {
      Alert.alert('ルームを選択してください');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.9 });

    if (result.canceled) return;

    setUploading(true);
    try {
      for (const asset of result.assets) {
        const ext = asset.uri.split('.').pop() ?? 'jpg';
        const key = `${currentRoomId}/${session.user.id}/${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: `upload.${ext}`,
          type: asset.type === 'video' ? `video/${ext}` : `image/${ext}`,
        } as any);

        // Upload via Supabase Edge Function (which then puts to R2)
        const { error } = await supabase.functions.invoke('upload-media', {
          body: formData,
          headers: { 'x-room-id': currentRoomId, 'x-r2-key': key },
        });

        if (error) throw error;
      }
      Alert.alert('アップロード完了！');
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>アップロード中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>投稿する</Text>
        <TouchableOpacity style={styles.btn} onPress={() => pickAndUpload(true)}>
          <Text style={styles.btnText}>📷 カメラで撮影</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => pickAndUpload(false)}>
          <Text style={[styles.btnText, styles.btnTextSecondary]}>🖼️ ライブラリから選択</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  hint: { marginTop: 12, color: '#888' },
  btn: {
    width: '100%',
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
