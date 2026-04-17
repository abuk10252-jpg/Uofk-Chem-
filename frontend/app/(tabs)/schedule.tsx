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

interface Schedule {
  id: string;
  day: string;
  time_start: string;
  time_end: string;
  subject_id: string;
  subject_name: string;
  location: string;
}

interface Subject {
  id: string;
  name: string;
}

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scheduleRes, subjectsRes] = await Promise.all([
        api.get('/schedule'),
        api.get('/subjects'),
      ]);
      setSchedule(scheduleRes.data);
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

  const handleAddSchedule = async () => {
    if (!selectedDay || !timeStart || !timeEnd || !subjectId) {
      Alert.alert('خطأ', 'الرجاء ملء جميع الحقول الإلزامية');
      return;
    }

    try {
      await api.post('/schedule', {
        day: selectedDay,
        time_start: timeStart,
        time_end: timeEnd,
        subject_id: subjectId,
        location,
      });
      Alert.alert('نجاح', 'تم إضافة الحصة بنجاح');
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('خطأ', 'فشل إضافة الحصة');
    }
  };

  const resetForm = () => {
    setSelectedDay('');
    setTimeStart('');
    setTimeEnd('');
    setSubjectId('');
    setLocation('');
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الحصة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/schedule/${id}`);
              loadData();
            } catch (error) {
              Alert.alert('خطأ', 'فشل حذف الحصة');
            }
          },
        },
      ]
    );
  };

  const groupByDay = () => {
    const grouped: { [key: string]: Schedule[] } = {};
    DAYS.forEach((day) => {
      grouped[day] = schedule.filter((item) => item.day === day);
    });
    return grouped;
  };

  const groupedSchedule = groupByDay();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {DAYS.map((day) => (
            <View key={day} style={styles.daySection}>
              <Text style={styles.dayTitle}>{day}</Text>
              {groupedSchedule[day].length > 0 ? (
                groupedSchedule[day].map((item) => (
                  <View key={item.id} style={styles.scheduleCard}>
                    <View style={styles.scheduleContent}>
                      <Text style={styles.subjectName}>{item.subject_name}</Text>
                      <Text style={styles.timeText}>
                        {item.time_start} - {item.time_end}
                      </Text>
                      {item.location ? (
                        <View style={styles.locationRow}>
                          <Text style={styles.locationText}>{item.location}</Text>
                          <Ionicons name="location" size={14} color="#6b7280" />
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyDayText}>لا توجد حصص</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Schedule Modal */}
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
            <Text style={styles.modalTitle}>إضافة حصة</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>اليوم *</Text>
            <View style={styles.daysContainer}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDay === day && styles.dayButtonSelected,
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      selectedDay === day && styles.dayButtonTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>المادة *</Text>
            <ScrollView horizontal style={styles.subjectsContainer}>
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

            <Text style={styles.label}>وقت البدء *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 08:00"
              value={timeStart}
              onChangeText={setTimeStart}
              textAlign="right"
            />

            <Text style={styles.label}>وقت الانتهاء *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 10:00"
              value={timeEnd}
              onChangeText={setTimeEnd}
              textAlign="right"
            />

            <Text style={styles.label}>الموقع</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: قاعة 101"
              value={location}
              onChangeText={setLocation}
              textAlign="right"
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleAddSchedule}>
              <Text style={styles.submitButtonText}>إضافة</Text>
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
  content: {
    padding: 16,
  },
  daySection: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'right',
  },
  scheduleCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scheduleContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'right',
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  deleteButton: {
    padding: 8,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'right',
    fontStyle: 'italic',
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
  daysContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dayButtonTextSelected: {
    color: '#fff',
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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