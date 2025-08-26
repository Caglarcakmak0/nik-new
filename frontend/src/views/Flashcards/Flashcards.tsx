import React, { useEffect, useMemo, useState } from 'react';
import {
  createFlashcard,
  getPracticeFlashcards,
  listFlashcards,
  submitFlashcardPractice,
  updateFlashcard,
  deleteFlashcard,
  Flashcard
} from '../../services/api';
import ReactMarkdown from 'react-markdown';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message as antdMessage,
  Segmented,
  Slider
} from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import './Flashcards.scss';

interface FormState {
  topic: string;
  question: string;
  answer: string;
  tags: string[];
  difficulty: number;
}

const emptyForm: FormState = { topic: '', question: '', answer: '', tags: [], difficulty: 3 };

const diffColor = (d: number) => ({ 1: 'green', 2: 'cyan', 3: 'blue', 4: 'orange', 5: 'red' } as any)[d] || 'blue';

const FlashcardsPage: React.FC = () => {
  const [form] = Form.useForm<FormState>();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [mode, setMode] = useState<'manage' | 'practice'>('manage');
  const [filterTopic, setFilterTopic] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [revealAnswer, setRevealAnswer] = useState(false);
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

  const startEdit = (card: Flashcard) => {
    setEditingId(card._id);
    form.setFieldsValue({
      topic: card.topic,
      question: card.question,
      answer: card.answer,
      tags: card.tags || [],
      difficulty: card.stats?.difficulty || 3
    });
  };

  const resetForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(emptyForm);
  };

  const onSubmit = async (values: FormState) => {
    if (!values.topic || !values.question || !values.answer) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateFlashcard(editingId, {
          topic: values.topic.trim(),
          question: values.question.trim(),
            answer: values.answer.trim(),
          tags: values.tags,
          difficulty: values.difficulty
        });
        antdMessage.success('Kart güncellendi');
      } else {
        await createFlashcard({
          topic: values.topic.trim(),
          question: values.question.trim(),
          answer: values.answer.trim(),
          tags: values.tags,
          difficulty: values.difficulty
        });
        antdMessage.success('Kart oluşturuldu');
      }
      resetForm();
      loadCards();
    } catch (e: any) {
      antdMessage.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeCard = async (id: string) => {
    try {
      await deleteFlashcard(id);
      antdMessage.success('Silindi');
      loadCards();
    } catch (e: any) {
      antdMessage.error(e.message);
    }
  };

  const beginPractice = async () => {
    if (!practiceTopic) { antdMessage.warning('Bir konu seç'); return; }
    try {
      const data = await getPracticeFlashcards(practiceTopic, practiceCount);
      setPracticeCards(data);
      setCurrentIndex(0);
      setRevealAnswer(false);
      setMode('practice');
    } catch (e: any) {
      antdMessage.error(e.message);
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
      setRevealAnswer(false);
    } else {
      antdMessage.success('Alıştırma tamamlandı');
      setMode('manage');
      loadCards();
    }
  };

  return (
    <div className="flashcards-page">
      <Row gutter={20}>
        <Col xs={24} lg={8} className="flashcards-side">
          <Card title={editingId ? 'Kartı Düzenle' : 'Yeni Kart'} size="small" extra={editingId && <Button size="small" onClick={resetForm}>Yeni</Button>}>
            <Form
              form={form}
              layout="vertical"
              initialValues={emptyForm}
              onFinish={onSubmit}
            >
              <Form.Item name="topic" label="Konu" rules={[{ required: true, message: 'Konu gerekli' }]}> 
                <Select
                  showSearch
                  placeholder="Örn: Trigonometri"
                  optionFilterProp="label"
                  dropdownRender={menu => (
                    <>
                      {menu}
                      <Divider style={{ margin: '4px 0' }} />
                      <div style={{ padding: 4 }}>
                        <Input
                          placeholder="Yeni konu yaz ve Enter"
                          onPressEnter={(e) => {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (v) {
                              const opts = topics.includes(v) ? topics : [...topics, v];
                              setFilterTopic(v);
                              form.setFieldValue('topic', v);
                              (e.target as HTMLInputElement).value='';
                            }
                          }}
                        />
                      </div>
                    </>
                  )}
                  options={topics.map(t => ({ value: t, label: t }))}
                  onChange={() => {/* noop */}}
                  allowClear
                />
              </Form.Item>
              <Form.Item name="question" label="Soru / Prompt" rules={[{ required: true, message: 'Soru gerekli' }]}> 
                <Input.TextArea rows={2} autoSize={{ minRows:2, maxRows:4 }} />
              </Form.Item>
              <Form.Item name="answer" label={<Space>Cevap / Formül<Tooltip title="Markdown desteklenir">ℹ️</Tooltip></Space>} rules={[{ required: true, message: 'Cevap gerekli' }]}> 
                <Input.TextArea rows={5} autoSize={{ minRows:5, maxRows:10 }} />
              </Form.Item>
              <Form.Item name="tags" label="Etiketler">
                <Select mode="tags" placeholder="Etiket ekle" open={false} tokenSeparators={[',']} />
              </Form.Item>
              <Form.Item name="difficulty" label="Zorluk">
                <Slider min={1} max={5} marks={{1:'1',2:'2',3:'3',4:'4',5:'5'}} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saving}>{editingId ? 'Güncelle' : 'Kaydet'}</Button>
                  {editingId && <Button onClick={resetForm}>İptal</Button>}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Card title="Alıştırma" size="small" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                placeholder="Konu Seç"
                options={topics.map(t => ({ value: t, label: t }))}
                value={practiceTopic}
                onChange={v => setPracticeTopic(v)}
                allowClear
              />
              <Select
                value={practiceCount}
                onChange={(v) => setPracticeCount(v)}
                options={[5,10,15,20].map(n => ({ value: n, label: `${n} kart` }))}
              />
              <Button block type="primary" onClick={beginPractice} disabled={!practiceTopic}>Başlat</Button>
              <Segmented
                options={[{ label:'Kartlar', value:'manage' }, { label:'Alıştırma', value:'practice' }]}
                value={mode}
                onChange={v => setMode(v as any)}
              />
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {mode === 'manage' && (
            <Card title={<Space>Kartlarım {filterTopic && <Tag color='geekblue'>{filterTopic}</Tag>}</Space>} extra={
              <Space>
                <Select
                  allowClear
                  placeholder="Konu Filtre"
                  size="small"
                  value={filterTopic}
                  onChange={(v) => setFilterTopic(v || undefined)}
                  style={{ minWidth: 140 }}
                  options={topics.map(t => ({ value: t, label: t }))}
                />
                <Input.Search size="small" placeholder="Ara" allowClear onSearch={v => setSearch(v)} style={{ width: 160 }} />
                <Button size="small" onClick={loadCards} loading={loading}>Yenile</Button>
              </Space>
            }>
              {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
              <Row gutter={[12,12]}>
                {cards.map(card => (
                  <Col xs={24} md={12} key={card._id}>
                    <Card
                      size="small"
                      className="flashcard-item"
                      title={<Space wrap>
                        <Tag color="purple">{card.topic}</Tag>
                        <Tag color={diffColor(card.stats?.difficulty || 3)}>Z{card.stats?.difficulty || 3}</Tag>
                        <Tag color="gold">{card.successRate ?? 0}%</Tag>
                      </Space>}
                      extra={<Space>
                        <Tooltip title="Düzenle"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => startEdit(card)} /></Tooltip>
                        <Popconfirm title="Silinsin mi?" onConfirm={() => removeCard(card._id)}>
                          <Button danger type="text" size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>}
                    >
                      <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'Devamı' }} className="card-question">{card.question}</Typography.Paragraph>
                      <Divider plain style={{ margin: '8px 0' }}>Cevap</Divider>
                      <div className="markdown-answer">
                        <ReactMarkdown>{card.answer}</ReactMarkdown>
                      </div>
                      <div className="meta-row">
                        <span>Gösterim: {card.stats?.timesShown ?? 0}</span>
                        <span>Doğru: {card.stats?.timesCorrect ?? 0}</span>
                      </div>
                    </Card>
                  </Col>
                ))}
                {cards.length === 0 && !loading && <Col span={24}><Alert type="info" message="Kart yok. Sol taraftan oluştur." /></Col>}
              </Row>
            </Card>
          )}

          {mode === 'practice' && (
            <Card title="Alıştırma" extra={<Button size="small" onClick={() => setMode('manage')}>Çık</Button>}>
              {!currentCard && <Alert type="info" message="Kart seçmedin ya da alıştırma bitti." />}
              {currentCard && (
                <div className="practice-area">
                  <Progress percent={practiceProgress} size="small" />
                  <div className="practice-head">
                    <Tag color="purple">{currentCard.topic}</Tag>
                    <Tag color={diffColor(currentCard.stats?.difficulty || 3)}>Z{currentCard.stats?.difficulty || 3}</Tag>
                    <Tag color='gold'>{currentCard.successRate ?? 0}%</Tag>
                  </div>
                  <Typography.Title level={5} className="practice-question">{currentCard.question}</Typography.Title>
                  <div className="practice-answer-box">
                    {revealAnswer ? (
                      <div className="markdown-answer reveal"><ReactMarkdown>{currentCard.answer}</ReactMarkdown></div>
                    ) : (
                      <div className="hidden-answer"><EyeInvisibleOutlined /> Cevabı Göster</div>
                    )}
                  </div>
                  <Space style={{ marginTop: 12 }}>
                    {!revealAnswer && <Button icon={<EyeOutlined />} onClick={() => setRevealAnswer(true)}>Cevabı Göster</Button>}
                    {revealAnswer && (
                      <>
                        <Button type="primary" icon={<CheckOutlined />} onClick={() => answerPractice(true)}>Bildim</Button>
                        <Button danger icon={<CloseOutlined />} onClick={() => answerPractice(false)}>Bilemedim</Button>
                      </>
                    )}
                  </Space>
                  <div className="practice-footer">{currentIndex + 1} / {practiceCards.length}</div>
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
