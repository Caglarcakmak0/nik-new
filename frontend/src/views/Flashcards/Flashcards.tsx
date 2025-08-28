// Rewritten Flashcards page (modular) inspired by external flashcards-ui structure
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Input, Progress, Row, Select, Space, Tag, message } from 'antd';
import {
  listFlashcards,
  deleteFlashcard,
  getPracticeFlashcards,
  submitFlashcardPractice,
  Flashcard
} from '../../services/api';
import FlashcardCreator from '../../components/flashcards/FlashcardCreator';
import FlashcardListItem from '../../components/flashcards/FlashcardListItem';
import PracticeSelector from '../../components/flashcards/PracticeSelector';
import ScrollStackDemo from '../../components/flashcards/ScrollStackDemo';
import ScrollStackPractice from '../../components/flashcards/ScrollStackPractice';
import '../../components/flashcards/ScrollStackDemo.scss';
import './Flashcards.scss';

const diffColor = (d: number) => ({1:'green',2:'cyan',3:'blue',4:'orange',5:'red'} as any)[d] || 'blue';

const FlashcardsPage: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [mode, setMode] = useState<'manage' | 'practice'>('manage');
  const [filterTopic, setFilterTopic] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceTopic, setPracticeTopic] = useState<string | undefined>();
  const [practiceCount, setPracticeCount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const loadCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFlashcards({ topic: filterTopic, search: search || undefined });
      setCards(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCards(); }, [filterTopic, search]);

  const topics = useMemo(() => Array.from(new Set(cards.map(c => c.topic))).sort(), [cards]);

  const startEdit = (card: Flashcard) => setEditingId(card._id);
  const cancelEdit = () => setEditingId(null);
  const afterSave = () => { cancelEdit(); loadCards(); };

  const removeCard = async (id: string) => {
    try { await deleteFlashcard(id); loadCards(); } catch {}
  };

  const beginPractice = async () => {
  if (!practiceTopic) { message.warning('Bir konu seç'); return; }
    try {
      const data = await getPracticeFlashcards(practiceTopic, practiceCount);
      setPracticeCards(data);
  setCurrentIndex(0);
      setMode('practice');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const currentCard = practiceCards[currentIndex];
  const practiceProgress = practiceCards.length ? Math.round(((currentIndex) / practiceCards.length) * 100) : 0;

  const answerPractice = async (correct: boolean) => {
    if (!currentCard) return;
    try {
      await submitFlashcardPractice(currentCard._id, correct);
    } catch {/* sessiz */}
    // sonraki
    if (currentIndex + 1 < practiceCards.length) {
      setCurrentIndex(i => i + 1);
    } else {
  message.success('Alıştırma tamamlandı');
  setMode('manage'); loadCards();
    }
  };

  const [showScrollDemo, setShowScrollDemo] = useState(false);

  return (
    <div className="flashcards-page modular">
      <Row gutter={20}>
        <Col xs={24} lg={8} className="flashcards-side">
          <Card title={editingId ? 'Kartı Düzenle' : 'Yeni Kart'} size="small" extra={editingId && <Button size="small" onClick={cancelEdit}>Yeni</Button>}>
            <FlashcardCreator
              topics={topics}
              editing={cards.find(c => c._id === editingId) || null}
              onSaved={afterSave}
              onCancelEdit={cancelEdit}
              setFilterTopic={setFilterTopic}
            />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Alıştırma" size="small" className="practice-selector-card" style={{ marginBottom:16 }} extra={<Button size="small" onClick={()=> setShowScrollDemo(s=>!s)}>{showScrollDemo? 'Stack Demo Kapat':'Stack Demo Aç'}</Button>}>
            <PracticeSelector
              topics={topics}
              practiceTopic={practiceTopic}
              practiceCount={practiceCount}
              mode={mode}
              setPracticeTopic={setPracticeTopic}
              setPracticeCount={setPracticeCount}
              setMode={setMode}
              beginPractice={beginPractice}
            />
            {showScrollDemo && (
              <div style={{marginTop:12}}>
                <ScrollStackDemo />
              </div>
            )}
          </Card>
          {mode === 'manage' && (
            <Card
              title={<Space>Kartlarım {filterTopic && <Tag color='geekblue'>{filterTopic}</Tag>}</Space>}
              extra={<Space>
                <Select allowClear placeholder="Konu Filtre" size="small" value={filterTopic} onChange={v => setFilterTopic(v || undefined)} style={{ minWidth:140 }} options={topics.map(t=>({ value:t, label:t }))} />
                <Input.Search size="small" placeholder="Ara" allowClear onSearch={v => setSearch(v)} style={{ width:160 }} />
                <Button size="small" onClick={loadCards} loading={loading}>Yenile</Button>
              </Space>}
            >
              {error && <Alert type="error" message={error} style={{ marginBottom:12 }} />}
              <Row gutter={[12,12]}>
                {cards.filter(c => !filterTopic || c.topic === filterTopic).filter(c => !search || c.question.toLowerCase().includes(search.toLowerCase()) || c.answer.toLowerCase().includes(search.toLowerCase())).map(card => (
                  <Col xs={24} md={12} key={card._id}>
                    <FlashcardListItem card={card} onEdit={startEdit} onDelete={removeCard} />
                  </Col>
                ))}
                {cards.length === 0 && !loading && <Col span={24}><Alert type="info" message="Kart yok. Soldan oluştur." /></Col>}
              </Row>
            </Card>
          )}
          {mode === 'practice' && (
            <Card title="Alıştırma" extra={<Button size="small" onClick={() => setMode('manage')}>Çık</Button>}>
              {!currentCard && <Alert type="info" message="Kart seçmedin ya da alıştırma bitti." />}
              {currentCard && (
                <div className="practice-area">
                  <Progress percent={practiceProgress} size="small" />
                  <ScrollStackPractice
                    cards={practiceCards}
                    index={currentIndex}
                    onAnswer={answerPractice}
                    diffColor={diffColor}
                    onNavigate={(next) => setCurrentIndex(next)}
                  />
                </div>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default FlashcardsPage;
