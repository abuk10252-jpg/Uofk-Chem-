import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  Modal, TextInput, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { useRouter } from 'expo-router';
import api from '../../services/api';

interface PendingUser { id: string; email: string; full_name: string; student_id?: string; created_at: string; }

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang, isRTL } = useLang();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingModal, setPendingModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');

  useEffect(() => { if (user?.role === 'supervisor') loadPending(); }, [user]);

  const loadPending = async () => {
    try { const r = await api.get('/users/pending'); setPendingUsers(r.data); } catch (e) {}
  };

  const handleApprove = async (id: string) => {
    try { await api.post(`/users/${id}/approve`); Alert.alert(t('success'), t('approve')); loadPending(); } catch (e) { Alert.alert(t('error'), ''); }
  };
  const handleReject = async (id: string) => {
    try { await api.post(`/users/${id}/reject`); loadPending(); } catch (e) {}
  };
  const handleCreateSubject = async () => {
    if (!subjectName) return;
    try { await api.post('/subjects', { name: subjectName, description: subjectDesc }); Alert.alert(t('success'), ''); setSubjectModal(false); setSubjectName(''); setSubjectDesc(''); } catch (e) { Alert.alert(t('error'), ''); }
  };
  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logoutBtn'), style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const imgUri = user?.profile_image ? (user.profile_image.startsWith('data:') ? user.profile_image : `data:image/jpeg;base64,${user.profile_image}`) : null;

  return (
    <SafeAreaView style={st.container} edges={['bottom']}>
      <ScrollView>
        <View style={st.header}>
          <TouchableOpacity style={st.editIcon} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
          {imgUri ? <Image source={{ uri: imgUri }} style={st.avatar} /> : (
            <View style={st.avatarBox}><Ionicons name="person" size={48} color="#fff" /></View>
          )}
          <Text style={st.name}>{user?.full_name}</Text>
          <Text style={st.email}>{user?.email}</Text>
          {user?.student_id ? <Text style={st.sid}>{t('studentId')}: {user.student_id}</Text> : null}
          <View style={st.tags}>
            <View style={st.roleTag}><Text style={st.tagText}>{user?.role === 'supervisor' ? t('supervisor') : t('student')}</Text></View>
            <View style={[st.statusTag, user?.status === 'approved' ? st.approvedTag : st.pendingTag]}>
              <Text style={st.tagText}>{user?.status === 'approved' ? t('approved') : t('pending')}</Text>
            </View>
          </View>
        </View>

        <View style={st.section}>
          {/* Language Toggle */}
          <TouchableOpacity style={st.menu} onPress={toggleLang}>
            <Ionicons name="chevron-back" size={20} color="#9ca3af" />
            <Text style={{ fontSize: 13, color: '#6b7280' }}>{lang === 'ar' ? 'English' : 'العربية'}</Text>
            <View style={st.menuContent}>
              <Text style={st.menuText}>{t('language')}</Text>
              <Ionicons name="language-outline" size={24} color="#2563eb" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={st.menu} onPress={() => router.push('/edit-profile')}>
            <Ionicons name="chevron-back" size={20} color="#9ca3af" />
            <View style={st.menuContent}>
              <Text style={st.menuText}>{t('editProfile')}</Text>
              <Ionicons name="person-circle-outline" size={24} color="#2563eb" />
            </View>
          </TouchableOpacity>

          {user?.role === 'supervisor' && (
            <>
              <TouchableOpacity style={st.menu} onPress={() => { loadPending(); setPendingModal(true); }}>
                <Ionicons name="chevron-back" size={20} color="#9ca3af" />
                {pendingUsers.length > 0 && <View style={st.badge}><Text style={st.badgeText}>{pendingUsers.length}</Text></View>}
                <View style={st.menuContent}>
                  <Text style={st.menuText}>{t('approveStudents')}</Text>
                  <Ionicons name="people-outline" size={24} color="#2563eb" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={st.menu} onPress={() => setSubjectModal(true)}>
                <Ionicons name="chevron-back" size={20} color="#9ca3af" />
                <View style={st.menuContent}>
                  <Text style={st.menuText}>{t('addSubject')}</Text>
                  <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                </View>
              </TouchableOpacity>
              <View style={{ height: 8, backgroundColor: '#f3f4f6' }} />
            </>
          )}

          <TouchableOpacity style={st.menu} onPress={handleLogout}>
            <Ionicons name="chevron-back" size={20} color="#9ca3af" />
            <View style={st.menuContent}>
              <Text style={[st.menuText, { color: '#ef4444' }]}>{t('logout')}</Text>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pending Modal */}
      <Modal visible={pendingModal} animationType="slide" onRequestClose={() => setPendingModal(false)}>
        <SafeAreaView style={st.modal}>
          <View style={st.modalHead}>
            <TouchableOpacity onPress={() => setPendingModal(false)}><Ionicons name="close" size={28} color="#1f2937" /></TouchableOpacity>
            <Text style={st.modalTitle}>{t('joinRequests')}</Text>
            <View style={{ width: 28 }} />
          </View>
          <FlatList data={pendingUsers} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={st.pCard}>
                <Text style={st.pName}>{item.full_name}</Text>
                <Text style={st.pEmail}>{item.email}</Text>
                {item.student_id ? <Text style={st.pSid}>{t('studentId')}: {item.student_id}</Text> : null}
                <View style={st.pActions}>
                  <TouchableOpacity style={[st.actBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleReject(item.id)}><Text style={st.actBtnText}>{t('reject')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[st.actBtn, { backgroundColor: '#10b981' }]} onPress={() => handleApprove(item.id)}><Text style={st.actBtnText}>{t('approve')}</Text></TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<View style={st.empty}><Ionicons name="checkmark-circle-outline" size={64} color="#10b981" /><Text style={st.emptyText}>{t('noRequests')}</Text></View>}
          />
        </SafeAreaView>
      </Modal>

      {/* Subject Modal */}
      <Modal visible={subjectModal} animationType="slide" onRequestClose={() => setSubjectModal(false)}>
        <SafeAreaView style={st.modal}>
          <View style={st.modalHead}>
            <TouchableOpacity onPress={() => setSubjectModal(false)}><Ionicons name="close" size={28} color="#1f2937" /></TouchableOpacity>
            <Text style={st.modalTitle}>{t('newSubject')}</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={{ padding: 16 }}>
            <Text style={st.label}>{t('subjectName')} *</Text>
            <TextInput style={st.input} value={subjectName} onChangeText={setSubjectName} textAlign={isRTL ? 'right' : 'left'} />
            <Text style={st.label}>{t('description')}</Text>
            <TextInput style={[st.input, { height: 120 }]} value={subjectDesc} onChangeText={setSubjectDesc} multiline textAlign={isRTL ? 'right' : 'left'} textAlignVertical="top" />
            <TouchableOpacity style={st.submitBtn} onPress={handleCreateSubject}><Text style={st.submitBtnText}>{t('create')}</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1e3a8a', padding: 32, alignItems: 'center' },
  editIcon: { position: 'absolute', top: 16, left: 16, padding: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff', marginBottom: 16 },
  avatarBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 3, borderColor: '#fff' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: '#bfdbfe', marginBottom: 4 },
  sid: { fontSize: 13, color: '#93c5fd', marginBottom: 12 },
  tags: { flexDirection: 'row', gap: 8 },
  roleTag: { backgroundColor: '#1d4ed8', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  statusTag: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  approvedTag: { backgroundColor: '#059669' },
  pendingTag: { backgroundColor: '#d97706' },
  tagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  menu: { flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuContent: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 16, color: '#1f2937' },
  badge: { backgroundColor: '#ef4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  modal: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  pCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  pName: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4, textAlign: 'right' },
  pEmail: { fontSize: 14, color: '#6b7280', marginBottom: 4, textAlign: 'right' },
  pSid: { fontSize: 13, color: '#9ca3af', marginBottom: 12, textAlign: 'right' },
  pActions: { flexDirection: 'row-reverse', gap: 8 },
  actBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
