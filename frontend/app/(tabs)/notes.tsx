import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Note {
  id: string;
  subject_id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function NotesScreen() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [notesRes, subjectsRes] = await Promise.all([
        api.get('/notes'),
        api.get('/subjects'),
      ]);
      setNotes(notesRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleSaveNote = async () => {
    if (!title || !content) {
      Alert.alert('خطأ', 'الرجاء ملء العنوان والمحتوى');
      return;
    }

    try {
      if (editingNote) {
        await api.put(`/notes/${editingNote.id}`, {
          subject_id: subjectId,
          title,
          content,
        });
        Alert.alert('نجاح', 'تم تحديث الملاحظة');
      } else {
        await api.post('/notes', {
          subject_id: subjectId,
          title,
          content,
        });
        Alert.alert('نجاح', 'تم إضافة الملاحظة');
      }
      
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('خطأ', 'فشل حفظ الملاحظة');
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSubjectId(note.subject_id);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الملاحظة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/notes/${id}`);
              loadData();
            } catch (error) {
              Alert.alert('خطأ', 'فشل حذف الملاحظة');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setSubjectId('');
  };

  const renderNoteItem = ({ item }: { item: Note }) => {
    const subject = subjects.find((s) => s.id === item.subject_id);
    
    return (
      <View style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <View style={styles.noteActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create-outline" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <Text style={styles.noteTitle}>{item.title}</Text>
        </View>
        
        <Text style={styles.noteContent} numberOfLines={3}>
          {item.content}
        </Text>
        
        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>
            {new Date(item.created_at).toLocaleDateString('ar-EG')}
          </Text>
          {subject && (
            <View style={styles.subjectTag}>
              <Text style={styles.subjectTagText}>{subject.name}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>لا توجد ملاحظات بعد</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Note Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingNote ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>العنوان *</Text>
            <TextInput
              style={styles.input}
              placeholder="عنوان الملاحظة"
              value={title}
              onChangeText={setTitle}
              textAlign="right"
            />

            {subjects.length > 0 && (
              <>
                <Text style={styles.label}>المادة (اختياري)</Text>
                <ScrollView horizontal style={styles.subjectsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.subjectButton,
                      !subjectId && styles.subjectButtonSelected,
                    ]}
                    onPress={() => setSubjectId('')}
                  >
                    <Text
                      style={[
                        styles.subjectButtonText,
                        !subjectId && styles.subjectButtonTextSelected,
                      ]}
                    >
                      عام
                    </Text>
                  </TouchableOpacity>
                  {subjects.map((subject) => (
                    <TouchableOpacity
                      key={subject.id}
                      style={[
                        styles.subjectButton,
                        subjectId === subject.id && styles.subjectButtonSelected,
                      ]}
                      onPress={() => setSubjectId(subject.id)}
                    >
                      <Text
                        style={[
                          styles.subjectButtonText,
                          subjectId === subject.id && styles.subjectButtonTextSelected,
                        ]}
                      >
                        {subject.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.label}>المحتوى *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="اكتب ملاحظتك هنا..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={12}
              textAlign="right"
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveNote}>
              <Text style={styles.submitButtonText}>
                {editingNote ? 'تحديث' : 'حفظ'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
  },
  noteActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  noteContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'right',
  },
  noteFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  subjectTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subjectTagText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 300,
  },
  subjectsContainer: {
    marginBottom: 20,
  },
  subjectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 8,
  },
  subjectButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  subjectButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  subjectButtonTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});