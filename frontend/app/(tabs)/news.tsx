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
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface News {
  id: string;
  title: string;
  content: string;
  news_type: string;
  poll_options: string[];
  poll_votes: Record<string, number>;
  quiz_questions: any[];
  quiz_time_limit: number;
  quiz_auto_publish: boolean;
  author_name: string;
  author_profile_image: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface Comment {
  id: string;
  user_name: string;
  user_profile_image: string;
  comment_text: string;
  created_at: string;
}

interface Reply {
  id: string;
  user_name: string;
  user_profile_image: string;
  comment_text: string;
  created_at: string;
}

export default function NewsScreen() {
  const { user } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedNews, setLikedNews] = useState<Set<string>>(new Set());
  
  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [quizTakeModalVisible, setQuizTakeModalVisible] = useState(false);
  
  // FAB
  const [fabOpen, setFabOpen] = useState(false);
  
  // News create
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Poll create
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  // Quiz create
  const [quizTitle, setQuizTitle] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState(0);
  const [quizAutoPublish, setQuizAutoPublish] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct_answer: 0 }
  ]);
  
  // Comments
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentReplies, setCommentReplies] = useState<Record<string, Reply[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  
  // Poll voting
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  
  // Quiz taking
  const [currentQuiz, setCurrentQuiz] = useState<News | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [submittedQuizzes, setSubmittedQuizzes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const response = await api.get('/news');
      setNews(response.data);
      
      const liked = new Set<string>();
      for (const item of response.data) {
        try {
          const r = await api.get(`/news/${item.id}/user-liked`);
          if (r.data.liked) liked.add(item.id);
        } catch (_e) {}
        
        // Check poll voted
        if (item.news_type === 'poll') {
          try {
            const ps = await api.get(`/news/${item.id}/poll-status`);
            if (ps.data.voted) setVotedPolls(prev => new Set(prev).add(item.id));
          } catch (_e) {}
        }
        
        // Check quiz submitted
        if (item.news_type === 'quiz') {
          try {
            const qs = await api.get(`/news/${item.id}/quiz-results`);
            if (qs.data.submitted) setSubmittedQuizzes(prev => new Set(prev).add(item.id));
          } catch (_e) {}
        }
      }
      setLikedNews(liked);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNews();
  }, []);

  // === CREATE HANDLERS ===
  const handleCreateNews = async () => {
    if (!title || !content) { Alert.alert('خطأ', 'الرجاء ملء جميع الحقول'); return; }
    try {
      await api.post('/news', { title, content, news_type: 'text' });
      Alert.alert('نجاح', 'تم نشر الخبر');
      setCreateModalVisible(false);
      setTitle(''); setContent('');
      setFabOpen(false);
      loadNews();
    } catch (error) { Alert.alert('خطأ', 'فشل نشر الخبر'); }
  };

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollTitle || validOptions.length < 2) {
      Alert.alert('خطأ', 'أدخل العنوان وخيارين على الأقل');
      return;
    }
    try {
      await api.post('/news/poll', { title: pollTitle, options: validOptions });
      Alert.alert('نجاح', 'تم إنشاء الاستطلاع');
      setPollModalVisible(false);
      setPollTitle(''); setPollOptions(['', '']);
      setFabOpen(false);
      loadNews();
    } catch (error) { Alert.alert('خطأ', 'فشل إنشاء الاستطلاع'); }
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle || quizQuestions.some(q => !q.question || q.options.some((o: string) => !o.trim()))) {
      Alert.alert('خطأ', 'أكمل جميع الأسئلة والخيارات');
      return;
    }
    try {
      await api.post('/news/quiz', {
        title: quizTitle,
        questions: quizQuestions,
        time_limit: quizTimeLimit,
        auto_publish: quizAutoPublish
      });
      Alert.alert('نجاح', 'تم إنشاء الاختبار');
      setQuizModalVisible(false);
      setQuizTitle(''); setQuizTimeLimit(0); setQuizAutoPublish(false);
      setQuizQuestions([{ question: '', options: ['', '', '', ''], correct_answer: 0 }]);
      setFabOpen(false);
      loadNews();
    } catch (error) { Alert.alert('خطأ', 'فشل إنشاء الاختبار'); }
  };

  // === INTERACTION HANDLERS ===
  const handleLike = async (newsId: string) => {
    try {
      await api.post('/news/react', { news_id: newsId, reaction_type: 'like' });
      const nl = new Set(likedNews);
      if (nl.has(newsId)) nl.delete(newsId); else nl.add(newsId);
      setLikedNews(nl);
      loadNews();
    } catch (error) { console.error('Error liking:', error); }
  };

  const handleVotePoll = async (newsId: string, optionIndex: number) => {
    if (votedPolls.has(newsId)) return;
    try {
      const formData = new FormData();
      formData.append('option_index', String(optionIndex));
      await api.post(`/news/${newsId}/vote`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVotedPolls(prev => new Set(prev).add(newsId));
      loadNews();
    } catch (error) { Alert.alert('خطأ', 'فشل التصويت'); }
  };

  const handleTakeQuiz = (item: News) => {
    if (submittedQuizzes.has(item.id)) {
      Alert.alert('', 'لقد أجبت على هذا الاختبار مسبقاً');
      return;
    }
    setCurrentQuiz(item);
    setQuizAnswers(new Array(item.quiz_questions.length).fill(-1));
    setQuizTimeLeft(item.quiz_time_limit > 0 ? item.quiz_time_limit * 60 : 0);
    setQuizTakeModalVisible(true);
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz) return;
    if (quizAnswers.includes(-1)) {
      Alert.alert('تنبيه', 'لم تجب على جميع الأسئلة. هل تريد التسليم؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسليم', onPress: () => submitQuiz() }
      ]);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!currentQuiz) return;
    try {
      const res = await api.post(`/news/${currentQuiz.id}/submit-quiz`, quizAnswers);
      setQuizTakeModalVisible(false);
      setSubmittedQuizzes(prev => new Set(prev).add(currentQuiz.id));
      if (res.data.results_available) {
        Alert.alert('النتيجة', `${res.data.score}/${res.data.total}`);
      } else {
        Alert.alert('تم التسليم', 'سيتم نشر النتائج لاحقاً');
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل تسليم الاختبار');
    }
  };

  // === COMMENTS ===
  const handleShowComments = async (newsItem: News) => {
    setSelectedNews(newsItem);
    try {
      const response = await api.get(`/news/${newsItem.id}/comments`);
      setComments(response.data);
      setCommentsModalVisible(true);
      const lc: Record<string, number> = {};
      const liked = new Set<string>();
      for (const c of response.data) {
        try {
          const lr = await api.get(`/comments/${c.id}/likes-count`);
          lc[c.id] = lr.data.likes_count;
          if (lr.data.user_liked) liked.add(c.id);
        } catch (_e) {}
      }
      setCommentLikeCounts(lc);
      setLikedComments(liked);
    } catch (error) { console.error('Error loading comments:', error); }
  };

  const handleAddComment = async () => {
    if (!newComment || !selectedNews) return;
    try {
      await api.post('/news/react', { news_id: selectedNews.id, reaction_type: 'comment', comment_text: newComment });
      setNewComment('');
      const r = await api.get(`/news/${selectedNews.id}/comments`);
      setComments(r.data);
      loadNews();
    } catch (error) { Alert.alert('خطأ', 'فشل إضافة التعليق'); }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText) return;
    try {
      const fd = new FormData();
      fd.append('reply_text', replyText);
      await api.post(`/comments/${commentId}/reply`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReplyText(''); setReplyingTo(null);
      const rr = await api.get(`/comments/${commentId}/replies`);
      setCommentReplies(p => ({ ...p, [commentId]: rr.data }));
      setExpandedComments(p => new Set(p).add(commentId));
    } catch (error) { Alert.alert('خطأ', 'فشل إضافة الرد'); }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const res = await api.post(`/comments/${commentId}/like`);
      const nl = new Set(likedComments);
      if (res.data.liked) {
        nl.add(commentId);
        setCommentLikeCounts(p => ({ ...p, [commentId]: (p[commentId] || 0) + 1 }));
      } else {
        nl.delete(commentId);
        setCommentLikeCounts(p => ({ ...p, [commentId]: Math.max(0, (p[commentId] || 0) - 1) }));
      }
      setLikedComments(nl);
    } catch (error) { console.error('Error:', error); }
  };

  const toggleReplies = async (commentId: string) => {
    const ne = new Set(expandedComments);
    if (ne.has(commentId)) { ne.delete(commentId); } else {
      ne.add(commentId);
      if (!commentReplies[commentId]) {
        try { const r = await api.get(`/comments/${commentId}/replies`); setCommentReplies(p => ({ ...p, [commentId]: r.data })); } catch (_e) {}
      }
    }
    setExpandedComments(ne);
  };

  // === HELPERS ===
  const renderProfileImg = (img: string, size = 36) => {
    if (img) {
      const uri = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
      return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="person" size={size * 0.5} color="#9ca3af" />
      </View>
    );
  };

  // === RENDER NEWS ===
  const renderNewsItem = ({ item }: { item: News }) => {
    const isLiked = likedNews.has(item.id);
    
    return (
      <View style={s.newsCard}>
        {/* Header */}
        <View style={s.cardHeader}>
          {renderProfileImg(item.author_profile_image, 40)}
          <View style={s.cardHeaderInfo}>
            <Text style={s.authorName}>{item.author_name}</Text>
            <Text style={s.cardDate}>{new Date(item.created_at).toLocaleDateString('ar-EG')}</Text>
          </View>
          {item.news_type !== 'text' && (
            <View style={[s.typeBadge, { backgroundColor: item.news_type === 'poll' ? '#8b5cf6' : '#f59e0b' }]}>
              <Ionicons name={item.news_type === 'poll' ? 'stats-chart' : 'school'} size={14} color="#fff" />
              <Text style={s.typeBadgeText}>{item.news_type === 'poll' ? 'استطلاع' : 'اختبار'}</Text>
            </View>
          )}
        </View>

        <Text style={s.newsTitle}>{item.title}</Text>
        
        {item.news_type === 'text' && item.content ? (
          <Text style={s.newsContent}>{item.content}</Text>
        ) : null}

        {/* Poll */}
        {item.news_type === 'poll' && (
          <View style={s.pollContainer}>
            {item.poll_options.map((opt, idx) => {
              const voted = votedPolls.has(item.id);
              const totalVotes = Object.values(item.poll_votes || {}).reduce((a, b) => a + b, 0);
              const votes = item.poll_votes?.[String(idx)] || 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[s.pollOption, voted && s.pollOptionVoted]}
                  onPress={() => handleVotePoll(item.id, idx)}
                  disabled={voted}
                >
                  {voted && <View style={[s.pollBar, { width: `${pct}%` }]} />}
                  <Text style={s.pollOptionText}>{opt}</Text>
                  {voted && <Text style={s.pollPctText}>{pct}%</Text>}
                </TouchableOpacity>
              );
            })}
            {votedPolls.has(item.id) && (
              <Text style={s.pollTotal}>
                {Object.values(item.poll_votes || {}).reduce((a, b) => a + b, 0)} صوت
              </Text>
            )}
          </View>
        )}

        {/* Quiz */}
        {item.news_type === 'quiz' && (
          <View style={s.quizContainer}>
            <Text style={s.quizInfo}>{item.quiz_questions.length} سؤال{item.quiz_time_limit > 0 ? ` | ${item.quiz_time_limit} دقيقة` : ''}</Text>
            <TouchableOpacity
              style={[s.quizBtn, submittedQuizzes.has(item.id) && s.quizBtnDone]}
              onPress={() => handleTakeQuiz(item)}
            >
              <Ionicons name={submittedQuizzes.has(item.id) ? 'checkmark-circle' : 'play-circle'} size={20} color="#fff" />
              <Text style={s.quizBtnText}>
                {submittedQuizzes.has(item.id) ? 'تم الإجابة' : 'ابدأ الاختبار'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleLike(item.id)}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? '#ef4444' : '#6b7280'} />
            <Text style={[s.actionText, isLiked && { color: '#ef4444' }]}>{item.likes_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleShowComments(item)}>
            <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
            <Text style={s.actionText}>{item.comments_count}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isLiked = likedComments.has(item.id);
    const likesCount = commentLikeCounts[item.id] || 0;
    const isExpanded = expandedComments.has(item.id);
    const replies = commentReplies[item.id] || [];

    return (
      <View style={s.commentCard}>
        <View style={s.commentHeader}>
          {renderProfileImg(item.user_profile_image, 36)}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.commentAuthor}>{item.user_name}</Text>
            <Text style={s.commentDate}>{new Date(item.created_at).toLocaleDateString('ar-EG')}</Text>
          </View>
        </View>
        <Text style={s.commentText}>{item.comment_text}</Text>
        
        <View style={s.commentActions}>
          <TouchableOpacity style={s.cmtActBtn} onPress={() => handleLikeComment(item.id)}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={16} color={isLiked ? '#ef4444' : '#9ca3af'} />
            <Text style={[s.cmtActText, isLiked && { color: '#ef4444' }]}>{likesCount > 0 ? likesCount : ''} إعجاب</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cmtActBtn} onPress={() => { setReplyingTo(item); setReplyText(''); }}>
            <Ionicons name="arrow-undo-outline" size={16} color="#9ca3af" />
            <Text style={s.cmtActText}>رد</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cmtActBtn} onPress={() => toggleReplies(item.id)}>
            <Ionicons name="chatbubbles-outline" size={16} color="#9ca3af" />
            <Text style={s.cmtActText}>{isExpanded ? 'إخفاء' : 'الردود'}</Text>
          </TouchableOpacity>
        </View>

        {replyingTo?.id === item.id && (
          <View style={s.replyRow}>
            <TouchableOpacity onPress={() => handleReply(item.id)}><Ionicons name="send" size={18} color="#1e3a8a" /></TouchableOpacity>
            <TextInput style={s.replyInput} placeholder={`رد على ${item.user_name}...`} value={replyText} onChangeText={setReplyText} textAlign="right" autoFocus />
            <TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close-circle" size={20} color="#9ca3af" /></TouchableOpacity>
          </View>
        )}

        {isExpanded && replies.length > 0 && (
          <View style={s.repliesBox}>
            {replies.map(r => (
              <View key={r.id} style={s.replyCard}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {renderProfileImg(r.user_profile_image, 24)}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1f2937' }}>{r.user_name}</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#4b5563', textAlign: 'right', paddingRight: 32 }}>{r.comment_text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <FlatList
        data={news}
        renderItem={renderNewsItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.empty}><Ionicons name="newspaper-outline" size={64} color="#d1d5db" /><Text style={s.emptyText}>لا توجد أخبار بعد</Text></View>
        }
      />

      {/* WhatsApp FAB */}
      {user?.role === 'supervisor' && (
        <View style={s.fabWrap}>
          {fabOpen && (
            <View style={s.fabMenu}>
              <TouchableOpacity style={s.fabItem} onPress={() => { setFabOpen(false); setCreateModalVisible(true); }}>
                <Text style={s.fabItemText}>نص</Text>
                <View style={[s.fabIcon, { backgroundColor: '#2563eb' }]}><Ionicons name="document-text" size={20} color="#fff" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={s.fabItem} onPress={() => { setFabOpen(false); setPollModalVisible(true); }}>
                <Text style={s.fabItemText}>استطلاع</Text>
                <View style={[s.fabIcon, { backgroundColor: '#8b5cf6' }]}><Ionicons name="stats-chart" size={20} color="#fff" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={s.fabItem} onPress={() => { setFabOpen(false); setQuizModalVisible(true); }}>
                <Text style={s.fabItemText}>اختبار</Text>
                <View style={[s.fabIcon, { backgroundColor: '#f59e0b' }]}><Ionicons name="school" size={20} color="#fff" /></View>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={[s.fab, fabOpen && { backgroundColor: '#6b7280' }]} onPress={() => setFabOpen(!fabOpen)}>
            <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Create Text Modal */}
      <Modal visible={createModalVisible} animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}><Ionicons name="close" size={28} color="#1f2937" /></TouchableOpacity>
            <Text style={s.modalTitle}>خبر جديد</Text>
            <TouchableOpacity onPress={handleCreateNews}><Text style={s.publishBtn}>نشر</Text></TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={{ padding: 16 }}>
              <TextInput style={s.inp} placeholder="العنوان" value={title} onChangeText={setTitle} textAlign="right" />
              <TextInput style={[s.inp, { height: 200 }]} placeholder="المحتوى" value={content} onChangeText={setContent} multiline textAlign="right" textAlignVertical="top" />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Create Poll Modal */}
      <Modal visible={pollModalVisible} animationType="slide" onRequestClose={() => setPollModalVisible(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => setPollModalVisible(false)}><Ionicons name="close" size={28} color="#1f2937" /></TouchableOpacity>
            <Text style={s.modalTitle}>استطلاع جديد</Text>
            <TouchableOpacity onPress={handleCreatePoll}><Text style={s.publishBtn}>إنشاء</Text></TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={{ padding: 16 }}>
              <TextInput style={s.inp} placeholder="سؤال الاستطلاع" value={pollTitle} onChangeText={setPollTitle} textAlign="right" />
              {pollOptions.map((opt, i) => (
                <View key={i} style={s.optionRow}>
                  <TextInput
                    style={[s.inp, { flex: 1, marginBottom: 0 }]}
                    placeholder={`الخيار ${i + 1}`}
                    value={opt}
                    onChangeText={(t) => { const n = [...pollOptions]; n[i] = t; setPollOptions(n); }}
                    textAlign="right"
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} style={{ padding: 8 }}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={s.addOptionBtn} onPress={() => setPollOptions([...pollOptions, ''])}>
                <Ionicons name="add-circle-outline" size={22} color="#2563eb" />
                <Text style={s.addOptionText}>إضافة خيار</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Create Quiz Modal */}
      <Modal visible={quizModalVisible} animationType="slide" onRequestClose={() => setQuizModalVisible(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => setQuizModalVisible(false)}><Ionicons name="close" size={28} color="#1f2937" /></TouchableOpacity>
            <Text style={s.modalTitle}>اختبار جديد</Text>
            <TouchableOpacity onPress={handleCreateQuiz}><Text style={s.publishBtn}>إنشاء</Text></TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={{ padding: 16 }}>
              <TextInput style={s.inp} placeholder="عنوان الاختبار" value={quizTitle} onChangeText={setQuizTitle} textAlign="right" />
              
              <View style={s.quizSettingsRow}>
                <View style={s.settingItem}>
                  <Text style={s.settingLabel}>مؤقت (دقائق)</Text>
                  <TextInput style={[s.inp, { width: 80, marginBottom: 0, textAlign: 'center' }]} value={quizTimeLimit > 0 ? String(quizTimeLimit) : ''} onChangeText={t => setQuizTimeLimit(parseInt(t) || 0)} keyboardType="numeric" placeholder="0" />
                </View>
                <View style={s.settingItem}>
                  <Text style={s.settingLabel}>نشر تلقائي</Text>
                  <Switch value={quizAutoPublish} onValueChange={setQuizAutoPublish} trackColor={{ true: '#1e3a8a' }} />
                </View>
              </View>

              {quizQuestions.map((q, qi) => (
                <View key={qi} style={s.questionCard}>
                  <View style={s.qHeader}>
                    <Text style={s.qNum}>سؤال {qi + 1}</Text>
                    {quizQuestions.length > 1 && (
                      <TouchableOpacity onPress={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qi))}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput style={s.inp} placeholder="نص السؤال" value={q.question} onChangeText={t => {
                    const n = [...quizQuestions]; n[qi] = { ...n[qi], question: t }; setQuizQuestions(n);
                  }} textAlign="right" />
                  
                  {q.options.map((opt: string, oi: number) => (
                    <TouchableOpacity key={oi} style={[s.quizOpt, q.correct_answer === oi && s.quizOptCorrect]} onPress={() => {
                      const n = [...quizQuestions]; n[qi] = { ...n[qi], correct_answer: oi }; setQuizQuestions(n);
                    }}>
                      <Ionicons name={q.correct_answer === oi ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={q.correct_answer === oi ? '#10b981' : '#9ca3af'} />
                      <TextInput
                        style={[s.quizOptInput]}
                        placeholder={`الخيار ${oi + 1}`}
                        value={opt}
                        onChangeText={t => {
                          const n = [...quizQuestions];
                          const opts = [...n[qi].options]; opts[oi] = t;
                          n[qi] = { ...n[qi], options: opts };
                          setQuizQuestions(n);
                        }}
                        textAlign="right"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              <TouchableOpacity style={s.addOptionBtn} onPress={() => setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], correct_answer: 0 }])}>
                <Ionicons name="add-circle-outline" size={22} color="#2563eb" />
                <Text style={s.addOptionText}>إضافة سؤال</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Take Quiz Modal */}
      <Modal visible={quizTakeModalVisible} animationType="slide" onRequestClose={() => setQuizTakeModalVisible(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => setQuizTakeModalVisible(false)}><Ionicons name="close" size={28} color="#1f2937" /></TouchableOpacity>
            <Text style={s.modalTitle}>{currentQuiz?.title}</Text>
            <TouchableOpacity onPress={handleSubmitQuiz}><Text style={s.publishBtn}>تسليم</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }}>
            {currentQuiz?.quiz_questions.map((q: any, qi: number) => (
              <View key={qi} style={s.questionCard}>
                <Text style={s.takeQText}>{qi + 1}. {q.question}</Text>
                {q.options.map((opt: string, oi: number) => (
                  <TouchableOpacity
                    key={oi}
                    style={[s.takeOpt, quizAnswers[qi] === oi && s.takeOptSelected]}
                    onPress={() => { const n = [...quizAnswers]; n[qi] = oi; setQuizAnswers(n); }}
                  >
                    <Ionicons name={quizAnswers[qi] === oi ? 'radio-button-on' : 'radio-button-off'} size={22} color={quizAnswers[qi] === oi ? '#1e3a8a' : '#9ca3af'} />
                    <Text style={[s.takeOptText, quizAnswers[qi] === oi && { color: '#1e3a8a', fontWeight: '600' }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={commentsModalVisible} animationType="slide" onRequestClose={() => { setCommentsModalVisible(false); setReplyingTo(null); }}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => { setCommentsModalVisible(false); setReplyingTo(null); }}><Ionicons name="close" size={28} color="#1f2937" /></TouchableOpacity>
            <Text style={s.modalTitle}>التعليقات</Text>
            <View style={{ width: 28 }} />
          </View>
          <FlatList data={comments} keyExtractor={i => i.id} renderItem={renderComment} contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>لا توجد تعليقات</Text></View>}
          />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.commentInputWrap}>
              <TouchableOpacity onPress={handleAddComment} style={{ padding: 8 }}><Ionicons name="send" size={20} color="#1e3a8a" /></TouchableOpacity>
              <TextInput style={s.commentInput} placeholder="أضف تعليق..." value={newComment} onChangeText={setNewComment} textAlign="right" />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  newsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardHeaderInfo: { flex: 1, alignItems: 'flex-end' },
  authorName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  cardDate: { fontSize: 11, color: '#9ca3af' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  newsTitle: { fontSize: 17, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'right' },
  newsContent: { fontSize: 14, color: '#4b5563', lineHeight: 22, marginBottom: 12, textAlign: 'right' },
  actionsRow: { flexDirection: 'row-reverse', gap: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingVertical: 4 },
  actionText: { fontSize: 14, color: '#6b7280' },
  
  // Poll
  pollContainer: { marginBottom: 12 },
  pollOption: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 8, position: 'relative', overflow: 'hidden', flexDirection: 'row-reverse', justifyContent: 'space-between' },
  pollOptionVoted: { borderColor: '#1e3a8a20' },
  pollBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1e3a8a15', borderRadius: 8 },
  pollOptionText: { fontSize: 14, color: '#1f2937', textAlign: 'right', zIndex: 1 },
  pollPctText: { fontSize: 13, fontWeight: '600', color: '#1e3a8a', zIndex: 1 },
  pollTotal: { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 4 },

  // Quiz
  quizContainer: { marginBottom: 12, padding: 12, backgroundColor: '#fef3c7', borderRadius: 10 },
  quizInfo: { fontSize: 13, color: '#92400e', marginBottom: 10, textAlign: 'right' },
  quizBtn: { backgroundColor: '#f59e0b', borderRadius: 10, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  quizBtnDone: { backgroundColor: '#10b981' },
  quizBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // FAB
  fabWrap: { position: 'absolute', right: 16, bottom: 16, alignItems: 'flex-end' },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  fabMenu: { marginBottom: 12, gap: 8 },
  fabItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, elevation: 3 },
  fabIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fabItemText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },

  // Modals
  modal: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  publishBtn: { fontSize: 16, fontWeight: '600', color: '#1e3a8a' },
  inp: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  
  // Poll create
  optionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginBottom: 10 },
  addOptionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, padding: 12, justifyContent: 'center' },
  addOptionText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },

  // Quiz create
  quizSettingsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  settingItem: { alignItems: 'center', gap: 8 },
  settingLabel: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  questionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  qHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qNum: { fontSize: 14, fontWeight: '600', color: '#1e3a8a' },
  quizOpt: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  quizOptCorrect: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  quizOptInput: { flex: 1, fontSize: 14, padding: 0 },

  // Take quiz
  takeQText: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12, textAlign: 'right' },
  takeOpt: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 8 },
  takeOptSelected: { borderColor: '#1e3a8a', backgroundColor: '#eff6ff' },
  takeOptText: { flex: 1, fontSize: 14, color: '#4b5563', textAlign: 'right' },

  // Comments
  commentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  commentHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentAuthor: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  commentText: { fontSize: 14, color: '#4b5563', textAlign: 'right', marginBottom: 8, paddingRight: 46 },
  commentDate: { fontSize: 11, color: '#9ca3af' },
  commentActions: { flexDirection: 'row-reverse', gap: 16, paddingRight: 46, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  cmtActBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingVertical: 6 },
  cmtActText: { fontSize: 12, color: '#9ca3af' },
  replyRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 8, paddingRight: 46 },
  replyInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13 },
  repliesBox: { marginTop: 8, paddingRight: 46, borderRightWidth: 2, borderRightColor: '#e5e7eb', marginRight: 46 },
  replyCard: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, marginBottom: 6 },
  
  // Comment input
  commentInputWrap: { flexDirection: 'row-reverse', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8, alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, padding: 10, paddingHorizontal: 16, fontSize: 14 },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
});
