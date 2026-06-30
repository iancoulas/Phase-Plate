import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { linkEmailToAnonymous, signInWithEmail } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onBack: () => void;
}

export default function AuthScreen({ onBack }: Props) {
  const { isAnonymous } = useAuth();
  const [mode, setMode] = useState<'create' | 'signin'>(isAnonymous ? 'create' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'create' && isAnonymous) {
        const err = await linkEmailToAnonymous(trimmedEmail, password);
        if (err) {
          setError(err);
        } else {
          Alert.alert(
            'Check Your Email',
            `A confirmation link has been sent to ${trimmedEmail}.\n\nTap the link to activate your account, then sign in on any device to access your data.`,
            [{ text: 'Got it', onPress: onBack }],
          );
        }
      } else {
        const err = await signInWithEmail(trimmedEmail, password);
        if (err) {
          setError(err);
        } else {
          onBack();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const isCreateMode = mode === 'create';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={22} color="#8B3A5A" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>
            {isCreateMode ? 'Create Account' : 'Sign In'}
          </Text>
          <Text style={styles.subheading}>
            {isCreateMode
              ? 'Save your data and access it across devices.'
              : 'Sign in to restore your data on this device.'}
          </Text>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, isCreateMode && styles.toggleBtnActive]}
              onPress={() => { setMode('create'); setError(null); }}
            >
              <Text style={[styles.toggleText, isCreateMode && styles.toggleTextActive]}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isCreateMode && styles.toggleBtnActive]}
              onPress={() => { setMode('signin'); setError(null); }}
            >
              <Text style={[styles.toggleText, !isCreateMode && styles.toggleTextActive]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#bbb"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={isCreateMode ? 'Choose a password (8+ chars)' : 'Your password'}
              placeholderTextColor="#bbb"
              secureTextEntry
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}


            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {isCreateMode ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {isCreateMode && (
              <Text style={styles.note}>
                Your existing health data and cycle history will be preserved.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ROSE = '#8B3A5A';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  scroll: { padding: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { color: ROSE, fontSize: 16, marginLeft: 2 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  subheading: { fontSize: 15, color: '#666', marginBottom: 28, lineHeight: 22 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 10,
    padding: 3,
    marginBottom: 28,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#888' },
  toggleTextActive: { color: ROSE, fontWeight: '700' },
  form: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: -4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 6,
  },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 8, padding: 12 },
  errorText: { color: '#C0392B', fontSize: 14, lineHeight: 20 },
  submitBtn: {
    backgroundColor: ROSE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  note: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
