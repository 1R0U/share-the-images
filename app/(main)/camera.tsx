import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useRoomStore } from '../../src/stores/roomStore';

type CapturedAsset = { uri: string; type?: string | null };

const PREVIEW_COL = 3;
const PREVIEW_GAP = 2;
const PREVIEW_ITEM_SIZE = (Dimensions.get('window').width - PREVIEW_GAP * (PREVIEW_COL - 1)) / PREVIEW_COL;

const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi|3gp|webm|mkv)$/i;
const isVideoAsset = (asset: CapturedAsset) =>
  asset.type === 'video' || (asset.type == null && VIDEO_EXT_RE.test(asset.uri));

export default function CameraScreen() {
  const session = useAuthStore((s) => s.session);
  const currentRoomId = useRoomStore((s) => s.currentRoomId);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const [previewAssets, setPreviewAssets] = useState<ImagePicker.ImagePickerAsset[] | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const capturingRef = useRef(false);
  const confirmingRef = useRef(false);

  // Uploads a single asset, throwing on failure. Caller decides how to
  // batch/report (single-shot camera capture vs. retryable multi-select).
  const uploadOne = async (asset: CapturedAsset) => {
    if (!session || !currentRoomId) throw new Error('ルームを選択してください');
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const key = `${currentRoomId}/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: `upload.${ext}`,
      type: isVideoAsset(asset) ? `video/${ext}` : `image/${ext}`,
    } as any);

    // Upload via Supabase Edge Function (which then puts to R2)
    const { error } = await supabase.functions.invoke('upload-media', {
      body: formData,
      headers: { 'x-room-id': currentRoomId, 'x-r2-key': key },
    });

    if (error) throw error;
  };

  const uploadSingle = async (asset: CapturedAsset) => {
    if (!session || !currentRoomId) {
      Alert.alert('ルームを選択してください');
      return;
    }
    setUploading(true);
    try {
      await uploadOne(asset);
      Alert.alert('アップロード完了！');
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setUploading(false);
    }
  };

  const openCamera = async () => {
    if (!session || !currentRoomId) {
      Alert.alert('ルームを選択してください');
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('カメラへのアクセスが許可されていません');
        return;
      }
    }
    setShowCamera(true);
  };

  const closeCamera = () => {
    setShowCamera(false);
    setCameraReady(false);
  };

  const takePicture = async () => {
    if (capturingRef.current || !cameraReady) return;
    capturingRef.current = true;
    try {
      const photo = await cameraRef.current?.takePictureAsync();
      if (photo?.uri) {
        closeCamera();
        await uploadSingle({ uri: photo.uri, type: 'image' });
      } else {
        Alert.alert('エラー', '撮影に失敗しました');
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message ?? '撮影に失敗しました');
    } finally {
      capturingRef.current = false;
    }
  };

  const pickFromLibrary = async () => {
    if (!session || !currentRoomId) {
      Alert.alert('ルームを選択してください');
      return;
    }
    if (!libraryPermission?.granted) {
      const result = await requestLibraryPermission();
      if (!result.granted) {
        Alert.alert('フォトライブラリへのアクセスが許可されていません');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled) return;
    setPreviewAssets(result.assets);
  };

  const cancelPreview = () => setPreviewAssets(null);

  const confirmUpload = async () => {
    if (!previewAssets || previewAssets.length === 0 || confirmingRef.current) return;
    if (!session || !currentRoomId) {
      Alert.alert('ルームを選択してください');
      return;
    }
    confirmingRef.current = true;
    setUploading(true);
    const failed: ImagePicker.ImagePickerAsset[] = [];
    let firstErrorMessage: string | null = null;
    for (const asset of previewAssets) {
      try {
        await uploadOne({ uri: asset.uri, type: asset.type });
      } catch (e: any) {
        failed.push(asset);
        firstErrorMessage = firstErrorMessage ?? e.message;
      }
    }
    setUploading(false);
    confirmingRef.current = false;
    if (failed.length === 0) {
      setPreviewAssets(null);
      Alert.alert('アップロード完了！');
    } else {
      // Keep only the failed assets in the preview so a retry doesn't
      // re-upload items that already succeeded.
      setPreviewAssets(failed);
      Alert.alert('エラー', `${failed.length}件のアップロードに失敗しました。再試行できます。\n${firstErrorMessage ?? ''}`);
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

  if (previewAssets) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>{previewAssets.length}件を選択中</Text>
        <FlatList
          data={previewAssets}
          keyExtractor={(item) => item.assetId ?? item.uri}
          numColumns={PREVIEW_COL}
          renderItem={({ item }) =>
            isVideoAsset(item) ? (
              <View style={[styles.previewThumb, styles.videoThumb]}>
                <Text style={styles.videoThumbIcon}>▶</Text>
              </View>
            ) : (
              <Image
                source={{ uri: item.uri }}
                style={styles.previewThumb}
                allowDownscaling
                contentFit="cover"
              />
            )
          }
          columnWrapperStyle={styles.previewRow}
          contentContainerStyle={styles.previewList}
        />
        <View style={styles.previewActions}>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary, styles.previewBtn]} onPress={cancelPreview}>
            <Text style={[styles.btnText, styles.btnTextSecondary]}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.previewBtn]} onPress={confirmUpload}>
            <Text style={styles.btnText}>投稿する</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
        <SafeAreaView style={styles.cameraOverlay}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="カメラを閉じる"
            style={styles.closeBtn}
            onPress={closeCamera}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="写真を撮影"
            style={styles.shutterBtn}
            onPress={takePicture}
            disabled={!cameraReady}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>投稿する</Text>
        <TouchableOpacity style={styles.btn} onPress={openCamera}>
          <Text style={styles.btnText}>📷 カメラで撮影</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={pickFromLibrary}>
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
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  shutterBtn: {
    alignSelf: 'center',
    marginBottom: 32,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  previewList: { gap: PREVIEW_GAP },
  previewRow: { gap: PREVIEW_GAP },
  previewThumb: { width: PREVIEW_ITEM_SIZE, height: PREVIEW_ITEM_SIZE },
  videoThumb: { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  videoThumbIcon: { color: '#fff', fontSize: 20 },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  previewBtn: { flex: 1, width: undefined },
});
