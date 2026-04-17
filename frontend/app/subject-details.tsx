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
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

type Category = 'all' | 'pdf' | 'video' | 'exercise';

interface FileItem {
  id: string;
  title: string;
  description: string;
  file_type: string;
  file_name: string;
  category: string;
  created_at: string;
}

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'all', label: 'الكل', icon: 'grid-outline' },
  { key: 'pdf', label: 'مستندات', icon: 'document-text-outline' },
  { key: 'video', label: 'فيديوهات', icon: 'videocam-outline' },
  { key: 'exercise', label: 'تمارين', icon: 'create-outline' },
];

export default function SubjectDetailsScreen() {
  const { id, name } = useLocalSearchParams();
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState<string>('pdf');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await api.get(`/files/subject/${id}`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFiles();
  }, []);

  const filteredFiles = selectedCategory === 'all'
    ? files
    : files.filter(f => f.category === selectedCategory);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل اختيار الملف');
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle || !selectedFile) {
      Alert.alert('خطأ', 'الرجاء إدخال العنوان واختيار ملف');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('subject_id', id as string);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDesc);
      formData.append('category', uploadCategory);
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      } as any);

      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      Alert.alert('نجاح', 'تم رفع الملف بنجاح');
      setUploadModalVisible(false);
      setUploadTitle('');
      setUploadDesc('');
      setSelectedFile(null);
      loadFiles();
    } catch (error) {
      Alert.alert('خطأ', 'فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileItem: FileItem) => {
    setDownloading(fileItem.id);
    try {
      const response = await api.get(`/files/${fileItem.id}/download`);
      const { file_data, file_name, file_type } = response.data;

      const fileUri = FileSystem.documentDirectory + file_name;
      await FileSystem.writeAsStringAsync(fileUri, file_data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('تم التحميل', `تم حفظ الملف: ${file_name}`);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل الملف');
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    Alert.alert('حذف الملف', 'هل أنت متأكد من حذف هذا الملف؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/files/${fileId}`);
            loadFiles();
          } catch (error) {
            Alert.alert('خطأ', 'فشل حذف الملف');
          }
        },
      },
    ]);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'video': return 'videocam';
      case 'exercise': return 'create';
      default: return 'document-text';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'video': return '#ef4444';
      case 'exercise': return '#f59e0b';
      default: return '#2563eb';
    }
  };

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => handleDownload(item)}
    >
      <View style={[styles.fileIcon, { backgroundColor: getCategoryColor(item.category) + '15' }]}>
        <Ionicons name={getCategoryIcon(item.category) as any} size={28} color={getCategoryColor(item.category)} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.fileDesc}>{item.description}</Text> : null}
        <View style={styles.fileMeta}>
          <Text style={styles.fileDate}>
            {new Date(item.created_at).toLocaleDateString('ar-EG')}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
            <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>
              {item.category === 'video' ? 'فيديو' : item.category === 'exercise' ? 'تمرين' : 'مستند'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.fileActions}>
        {downloading === item.id ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <Ionicons name="download-outline" size={22} color="#2563eb" />
        )}
        {user?.role === 'supervisor' && (
          <TouchableOpacity onPress={() => handleDeleteFile(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: (name as string) || 'تفاصيل المادة',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e3a8a' },
          headerTintColor: '#fff',
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryTab, selectedCategory === cat.key && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={selectedCategory === cat.key ? '#fff' : '#6b7280'}
                />
                <Text style={[styles.categoryTabText, selectedCategory === cat.key && styles.categoryTabTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredFiles}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filesList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {selectedCategory === 'all' ? 'لا توجد ملفات بعد' : 'لا توجد ملفات في هذا التصنيف'}
              </Text>
            </View>
          }
        />

        {/* Upload FAB for supervisors */}
        {user?.role === 'supervisor' && (
          <TouchableOpacity style={styles.fab} onPress={() => setUploadModalVisible(true)}>
            <Ionicons name="cloud-upload" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Upload Modal */}
        <Modal visible={uploadModalVisible} animationType="slide" transparent={false} onRequestClose={() => setUploadModalVisible(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>رفع ملف جديد</Text>
              <View style={{ width: 28 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Text style={styles.label}>العنوان *</Text>
                <TextInput style={styles.input} value={uploadTitle} onChangeText={setUploadTitle} placeholder="عنوان الملف" textAlign="right" />

                <Text style={styles.label}>الوصف</Text>
                <TextInput style={[styles.input, styles.textArea]} value={uploadDesc} onChangeText={setUploadDesc} placeholder="وصف اختياري..." multiline textAlign="right" textAlignVertical="top" />

                <Text style={styles.label}>التصنيف *</Text>
                <View style={styles.categoryPicker}>
                  {[
                    { key: 'pdf', label: 'مستند/PDF', icon: 'document-text' },
                    { key: 'video', label: 'فيديو', icon: 'videocam' },
                    { key: 'exercise', label: 'تمرين', icon: 'create' },
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.categoryOption, uploadCategory === cat.key && styles.categoryOptionActive]}
                      onPress={() => setUploadCategory(cat.key)}
                    >
                      <Ionicons name={cat.icon as any} size={20} color={uploadCategory === cat.key ? '#1e3a8a' : '#9ca3af'} />
                      <Text style={[styles.categoryOptionText, uploadCategory === cat.key && { color: '#1e3a8a' }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>الملف *</Text>
                <TouchableOpacity style={styles.filePicker} onPress={pickDocument}>
                  <Ionicons name="attach" size={24} color="#6b7280" />
                  <Text style={styles.filePickerText}>{selectedFile ? selectedFile.name : 'اختر ملف...'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.uploadBtn, uploading && { opacity: 0.6 }]} onPress={handleUpload} disabled={uploading}>
                  {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadBtnText}>رفع الملف</Text>}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  categoryTabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  categoryTabActive: {
    backgroundColor: '#1e3a8a',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  filesList: {
    padding: 16,
  },
  fileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  fileIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  fileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  fileDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  fileDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fileActions: {
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 4,
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
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 100,
  },
  categoryPicker: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 16,
  },
  categoryOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  categoryOptionActive: {
    borderColor: '#1e3a8a',
    backgroundColor: '#eff6ff',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filePicker: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  filePickerText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'right',
  },
  uploadBtn: {
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
