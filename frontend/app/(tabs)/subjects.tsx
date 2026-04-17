import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import api from '../../services/api';
import { cachedFetch } from '../../services/cache';

interface Subject {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function SubjectsScreen() {
  const { user } = useAuth();
  const { t, isRTL } = useLang();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    try {
      const data = await cachedFetch(api, '/subjects');
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadSubjects(); }, []);

  const openEdit = (item: Subject) => {
    setEditSubject(item);
    setEditName(item.name);
    setEditDesc(item.description);
    setEditModal(true);
  };

  const handleUpdateSubject = async () => {
    if (!editName || !editSubject) return;
    try {
      await api.put(`/subjects/${editSubject.id}`, { name: editName, description: editDesc });
      Alert.alert(t('success'), t('subjectUpdated'));
      setEditModal(false);
      loadSubjects();
    } catch (error) { Alert.alert(t('error'), 'Failed to update subject'); }
  };

  const renderSubjectItem = ({ item }: { item: Subject }) => (
    <TouchableOpacity
      style={styles.subjectCard}
      onPress={() => router.push(`/subject-details?id=${item.id}&name=${encodeURIComponent(item.name)}`)}
    >
      <View style={styles.subjectIconContainer}>
        <Ionicons name="book" size={32} color="#2563eb" />
      </View>
      <View style={styles.subjectInfo}>
        <Text style={[styles.subjectName, { textAlign: isRTL ? 'right' : 'left' }]}>{item.name}</Text>
        {item.description ? (
          <Text style={[styles.subjectDescription, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      {user?.role === 'supervisor' && (
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
          <Ionicons name="create-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      )}
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={24} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={subjects}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>{t('noSubjects')}</Text>
          </View>
        }
      />

      <Modal visible={editModal} animationType="slide" transparent={true} onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('editSubject')}</Text>
            <Text style={styles.label}>{t('subjectName')} *</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} textAlign={isRTL ? 'right' : 'left'} />
            <Text style={styles.label}>{t('description')}</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={editDesc} onChangeText={setEditDesc} multiline textAlign={isRTL ? 'right' : 'left'} textAlignVertical="top" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateSubject}>
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { padding: 16 },
  subjectCard: {
    flexDirection: 'row-reverse', backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 12, alignItems: 'center',
  },
  subjectIconContainer: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  subjectDescription: { fontSize: 14, color: '#6b7280' },
  editBtn: { padding: 8, marginRight: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 6 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: '#6b7280', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1e3a8a', alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
