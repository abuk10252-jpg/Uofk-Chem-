import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import api from '../services/api';

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { t, isRTL } = useLang();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');

  useEffect(() => {
    api.get(`/users/${user?.id}/profile`).then(r => {
      setBio(r.data.bio || '');
      setProfileImage(r.data.profile_image || '');
      if (r.data.full_name) setFullName(r.data.full_name);
    }).catch(() => {});
  }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('error'), 'Permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true });
    if (!result.canceled && result.assets[0].base64) setProfileImage(result.assets[0].base64);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/users/profile', { full_name: fullName || undefined, bio, profile_image: profileImage || undefined });
      Alert.alert(t('success'), t('profileUpdated'));
      await refreshUser();
      router.back();
    } catch (error: any) {
      Alert.alert(t('error'), error.response?.data?.detail || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('editProfile'), headerShown: true, headerStyle: { backgroundColor: '#1e3a8a' }, headerTintColor: '#fff' }} />
      <SafeAreaView style={s.container} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <View style={s.imgSection}>
              <TouchableOpacity onPress={pickImage} style={s.imgWrap}>
                {profileImage ? (
                  <Image source={{ uri: profileImage.startsWith('data:') ? profileImage : `data:image/jpeg;base64,${profileImage}` }} style={s.img} />
                ) : (
                  <View style={s.placeholder}><Ionicons name="person" size={64} color="#9ca3af" /></View>
                )}
                <View style={s.camIcon}><Ionicons name="camera" size={20} color="#fff" /></View>
              </TouchableOpacity>
              <Text style={s.hint}>{t('tapToChange')}</Text>
            </View>
            <Text style={s.label}>{t('fullName')}</Text>
            <TextInput style={s.input} value={fullName} onChangeText={setFullName} textAlign={isRTL ? 'right' : 'left'} />
            <Text style={s.label}>{t('bio')}</Text>
            <TextInput style={[s.input, { height: 120 }]} value={bio} onChangeText={setBio} placeholder={t('bioPlaceholder')} multiline textAlign={isRTL ? 'right' : 'left'} textAlignVertical="top" />
            <TouchableOpacity style={[s.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{t('saveChanges')}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  imgSection: { alignItems: 'center', marginBottom: 32 },
  imgWrap: { position: 'relative', marginBottom: 8 },
  img: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#1e3a8a' },
  placeholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#1e3a8a' },
  camIcon: { position: 'absolute', right: 0, bottom: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  hint: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  saveBtn: { backgroundColor: '#1e3a8a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
