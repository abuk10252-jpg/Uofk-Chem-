import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

export default function PendingScreen() {
  const { logout } = useAuth();
  const { t } = useLang();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Ionicons name="hourglass-outline" size={80} color="#f59e0b" />
        <Text style={s.title}>{t('pendingTitle')}</Text>
        <Text style={s.msg}>{t('pendingMsg')}</Text>
        <TouchableOpacity style={s.btn} onPress={async () => await logout()}>
          <Text style={s.btnText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 24, marginBottom: 12 },
  msg: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  btn: { backgroundColor: '#1e3a8a', borderRadius: 12, padding: 16, paddingHorizontal: 32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
