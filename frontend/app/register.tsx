import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t, isRTL } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !fullName || !studentId) { Alert.alert(t('error'), t('fillAll')); return; }
    setLoading(true);
    try {
      await register(email, password, fullName, studentId);
      Alert.alert(t('registerSuccess'), t('registerMsg'), [{ text: t('ok'), onPress: () => router.replace('/login') }]);
    } catch (error: any) {
      Alert.alert(t('error'), error.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>UofK Chem</Text>
          <Text style={s.subtitle}>{t('register')}</Text>
          <TextInput style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]} placeholder={t('fullName')} value={fullName} onChangeText={setFullName} />
          <TextInput style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]} placeholder={t('studentId')} value={studentId} onChangeText={setStudentId} />
          <TextInput style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]} placeholder={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]} placeholder={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('register')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={s.link}>{t('haveAccount')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 20, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  btn: { backgroundColor: '#1e3a8a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563eb', fontSize: 16, textAlign: 'center' },
});
