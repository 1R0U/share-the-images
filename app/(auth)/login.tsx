import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';

type Provider = 'google' | 'line';

export default function LoginScreen() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const { setGuest } = useAuthStore();

  const handleOAuthResult = async (result: WebBrowser.WebBrowserAuthSessionResult) => {
    if (result.type !== 'success') return;
    const { error } = await supabase.auth.exchangeCodeForSession(result.url);
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    try {
      setLoading('google');
      const redirectTo = Linking.createURL('auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('OAuth URL not returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      await handleOAuthResult(result);
    } catch (e: any) {
      Alert.alert('ログインエラー', e?.message ?? 'Googleログインに失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const signInWithLine = async () => {
    try {
      setLoading('line');
      const redirectTo = Linking.createURL('auth/callback');

      // Get LINE OAuth URL from our Edge Function
      const { data, error } = await supabase.functions.invoke('line-auth');
      if (error || !data?.url) throw error ?? new Error('LINE URL not returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      await handleOAuthResult(result);
    } catch (e: any) {
      Alert.alert('ログインエラー', e?.message ?? 'LINEログインに失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const renderButton = (
    provider: Provider,
    label: string,
    style: object,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      style={[styles.btn, style, loading !== null && styles.btnDisabled]}
      onPress={onPress}
      disabled={loading !== null}
    >
      {loading === provider ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Share the Images</Text>
        <Text style={styles.subtitle}>大切な人と、大切な瞬間を。</Text>
      </View>

      <View style={styles.actions}>
        {renderButton('google', 'Googleでログイン', styles.googleBtn, signInWithGoogle)}
        {renderButton('line', 'LINEでログイン', styles.lineBtn, signInWithLine)}
        <TouchableOpacity
          style={styles.guestBtn}
          onPress={setGuest}
          disabled={loading !== null}
        >
          <Text style={styles.guestBtnText}>ゲストとして続ける</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    padding: 32,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  actions: {
    gap: 12,
    paddingBottom: 16,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBtn: {
    backgroundColor: '#4285F4',
  },
  lineBtn: {
    backgroundColor: '#06C755',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  guestBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestBtnText: {
    color: '#999',
    fontSize: 14,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
