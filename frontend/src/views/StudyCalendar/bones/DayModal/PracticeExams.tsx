import React, { useState, useEffect } from 'react';
import { Space, Spin, Form, Row, Col, Select, Input, Button, message } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { useTheme } from '../../../../contexts/ThemeContext';
import { StudySession } from '../../types';
import { apiRequest } from '../../../../services/api';
import { SUBJECT_TOPIC_BANK, normalizeSubjectKey } from '../../../../constants/subjectTopics';

// Öğrencinin seanslarında görünmese bile tüm branş dersleri listelenebilsin diye sabit liste
const BRANCH_SUBJECTS = [
  { label: 'TYT - Türkçe', value: 'turkce' },
  { label: 'TYT - Tarih', value: 'tarih' },
  { label: 'TYT - Coğrafya', value: 'cografya' },
  { label: 'TYT - Felsefe', value: 'felsefe' },
  { label: 'TYT - Din Kültürü', value: 'din_kultur' },
  { label: 'TYT - Matematik', value: 'matematik' },
  { label: 'TYT - Geometri', value: 'geometri' },
  { label: 'TYT - Fizik', value: 'fizik' },
  { label: 'TYT - Kimya', value: 'kimya' },
  { label: 'TYT - Biyoloji', value: 'biyoloji' },
  { label: 'AYT - Edebiyat', value: 'edebiyat' },
  { label: 'AYT - Tarih', value: 'tarih_ayt' },
  { label: 'AYT - Coğrafya', value: 'cografya_ayt' },
  { label: 'AYT - Felsefe', value: 'felsefe_ayt' },
  { label: 'AYT - Din Kültürü', value: 'din_kultur_ayt' },
  { label: 'AYT - Matematik', value: 'matematik_ayt' },
  { label: 'AYT - Fizik', value: 'fizik_ayt' },
  { label: 'AYT - Kimya', value: 'kimya_ayt' },
  { label: 'AYT - Biyoloji', value: 'biyoloji_ayt' },
  { label: 'YDT - İngilizce', value: 'ingilizce' },
  { label: 'YDT - Almanca', value: 'almanca' },
  { label: 'YDT - Fransızca', value: 'fransizca' },
  { label: 'Diğer', value: 'diger' }
];

// Section adı + kategoriye göre topic bank key'i (StudentExams'teki ile senkron tutmak için basit versiyon)
function resolveTopicBankKey(sectionName: string): string {
  if (!sectionName) return 'diger';
  // Doğrudan key mevcutsa
  if (SUBJECT_TOPIC_BANK[sectionName]) return sectionName;
  const norm = normalizeSubjectKey(sectionName);
  if (SUBJECT_TOPIC_BANK[norm]) return norm;
  return norm;
}

interface PracticeExamsProps {
  dayModalDate: Dayjs;
  sessions: StudySession[];
}

const PracticeExams: React.FC<PracticeExamsProps> = ({ dayModalDate, sessions: _sessions }) => {
  const { isDark } = useTheme();
  const [examForm] = Form.useForm();
  const [dayExams, setDayExams] = useState<any[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [addingExam, setAddingExam] = useState(false);

  const textPrimary = isDark ? '#f1f5f9' : '#1f2937';

  // Fetch practice exams for a day
  const fetchDayExams = async (date: Dayjs) => {
    try {
      setExamLoading(true);
      const from = date.startOf('day').toISOString();
      const to = date.endOf('day').toISOString();
      const res = await apiRequest(`/student/exams?from=${from}&to=${to}&limit=100`, { method: 'GET' });
      setDayExams(res?.data || []);
    } catch {
      setDayExams([]);
    } finally {
      setExamLoading(false);
    }
  };

  const addPracticeExam = async () => {
    try {
      const values = await examForm.validateFields();
      setAddingExam(true);
      const payload: any = {
        date: dayModalDate.startOf('day').toISOString(),
        category: values.category,
        title: values.title || undefined,
        notes: values.notes || undefined,
        sections: [] as any[]
      };

  if (values.category === 'BRANS') {
        payload.branchSubject = values.branchSubject;
        payload.sections.push({
          name: values.branchSubject,
          totalQuestions: Number(values.totalQuestions) || 0,
            correctAnswers: Number(values.correctAnswers) || 0,
            wrongAnswers: Number(values.wrongAnswers) || 0,
            blankAnswers: Number(values.blankAnswers) || 0,
            wrongTopics: Array.isArray(values.branchWrongTopics) ? values.branchWrongTopics : []
        });
      } else if (values.category === 'TYT_GENEL') {
        payload.sections = [
          {
            name: 'Türkçe',
            totalQuestions: 40,
            correctAnswers: Number(values.turkceCorrect) || 0,
            wrongAnswers: Number(values.turkceWrong) || 0,
    blankAnswers: Math.max(0, 40 - (Number(values.turkceCorrect) || 0) - (Number(values.turkceWrong) || 0)),
    wrongTopics: Array.isArray(values.tytWrongTopics_turkce) ? values.tytWrongTopics_turkce : []
          },
          {
            name: 'Sosyal',
            totalQuestions: 20,
            correctAnswers: Number(values.sosyalCorrect) || 0,
            wrongAnswers: Number(values.sosyalWrong) || 0,
    blankAnswers: Math.max(0, 20 - (Number(values.sosyalCorrect) || 0) - (Number(values.sosyalWrong) || 0)),
    wrongTopics: Array.isArray(values.tytWrongTopics_sosyal) ? values.tytWrongTopics_sosyal : []
          },
          {
            name: 'Matematik',
            totalQuestions: 40,
            correctAnswers: Number(values.matematikCorrect) || 0,
            wrongAnswers: Number(values.matematikWrong) || 0,
    blankAnswers: Math.max(0, 40 - (Number(values.matematikCorrect) || 0) - (Number(values.matematikWrong) || 0)),
    wrongTopics: Array.isArray(values.tytWrongTopics_matematik) ? values.tytWrongTopics_matematik : []
          },
          {
            name: 'Fen',
            totalQuestions: 20,
            correctAnswers: Number(values.fenCorrect) || 0,
            wrongAnswers: Number(values.fenWrong) || 0,
    blankAnswers: Math.max(0, 20 - (Number(values.fenCorrect) || 0) - (Number(values.fenWrong) || 0)),
    wrongTopics: Array.isArray(values.tytWrongTopics_fen) ? values.tytWrongTopics_fen : []
          }
        ];
      } else if (values.category === 'AYT_GENEL') {
        payload.sections = [
          {
            name: 'Edebiyat-Sosyal1',
            totalQuestions: 40,
            correctAnswers: Number(values.edebiyatCorrect) || 0,
            wrongAnswers: Number(values.edebiyatWrong) || 0,
    blankAnswers: Math.max(0, 40 - (Number(values.edebiyatCorrect) || 0) - (Number(values.edebiyatWrong) || 0)),
    wrongTopics: Array.isArray(values.aytWrongTopics_edebiyat) ? values.aytWrongTopics_edebiyat : []
          },
          {
            name: 'Sosyal2',
            totalQuestions: 40,
            correctAnswers: Number(values.sosyal2Correct) || 0,
            wrongAnswers: Number(values.sosyal2Wrong) || 0,
    blankAnswers: Math.max(0, 40 - (Number(values.sosyal2Correct) || 0) - (Number(values.sosyal2Wrong) || 0)),
    wrongTopics: Array.isArray(values.aytWrongTopics_sosyal2) ? values.aytWrongTopics_sosyal2 : []
          },
          {
            name: 'Matematik',
            totalQuestions: 40,
            correctAnswers: Number(values.aytmatCorrect) || 0,
            wrongAnswers: Number(values.aytmatWrong) || 0,
    blankAnswers: Math.max(0, 40 - (Number(values.aytmatCorrect) || 0) - (Number(values.aytmatWrong) || 0)),
    wrongTopics: Array.isArray(values.aytWrongTopics_matematik) ? values.aytWrongTopics_matematik : []
          },
          {
            name: 'Fen',
            totalQuestions: 40,
            correctAnswers: Number(values.aytfenCorrect) || 0,
            wrongAnswers: Number(values.aytfenWrong) || 0,
    blankAnswers: Math.max(0, 40 - (Number(values.aytfenCorrect) || 0) - (Number(values.aytfenWrong) || 0)),
    wrongTopics: Array.isArray(values.aytWrongTopics_fen) ? values.aytWrongTopics_fen : []
          }
        ];
      }

      await apiRequest('/student/exams', { method: 'POST', body: JSON.stringify(payload) });
      message.success('Deneme eklendi');
      examForm.resetFields();
      fetchDayExams(dayModalDate);
    } catch (e: any) {
      if (e?.errorFields) return; // validation
      message.error(e?.message || 'Deneme eklenemedi');
    } finally {
      setAddingExam(false);
    }
  };

  useEffect(() => {
    fetchDayExams(dayModalDate);
  }, [dayModalDate]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>
          <BookOutlined style={{ color: '#6366f1' }} /> Deneme Sınavları
        </Space>
        {examLoading && <Spin size="small" />}
      </div>

      <div style={{ marginBottom: 16 }}>
        {dayExams.length > 0 && (
          <div style={{ 
            maxHeight: 180, 
            overflowY: 'auto', 
            marginBottom: 12, 
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', 
            borderRadius: 12, 
            padding: 8 
          }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: isDark ? '#1e293b' : '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>Tür</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Başlık</th>
                  <th style={{ padding: 4 }}>Toplam Soru</th>
                  <th style={{ padding: 4 }}>Doğru</th>
                  <th style={{ padding: 4 }}>Yanlış</th>
                  <th style={{ padding: 4 }}>Boş</th>
                  <th style={{ padding: 4 }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {dayExams.map(ex => (
                  <tr key={ex._id} style={{ borderBottom: '1px solid ' + (isDark ? '#334155' : '#e2e8f0') }}>
                    <td style={{ padding: 4, fontWeight: 500 }}>{ex.category}</td>
                    <td style={{ padding: 4 }}>{ex.title || (ex.category === 'BRANS' ? ex.branchSubject : '-')}</td>
                    <td style={{ padding: 4 }}>{ex.totals?.totalQuestions || 0}</td>
                    <td style={{ padding: 4 }}>{ex.totals?.correctAnswers || 0}</td>
                    <td style={{ padding: 4 }}>{ex.totals?.wrongAnswers || 0}</td>
                    <td style={{ padding: 4 }}>{ex.totals?.blankAnswers || 0}</td>
                    <td style={{ padding: 4, fontWeight: 600 }}>{ex.totals?.net || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Form 
          form={examForm} 
          layout="vertical" 
          size="small" 
          style={{ 
            background: isDark ? '#0f172a' : '#f8fafc', 
            padding: 12, 
            borderRadius: 12, 
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0' 
          }}
        >
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="category" label="Tür" rules={[{ required: true, message: 'Tür' }]}>
                <Select options={[
                  { value: 'TYT_GENEL', label: 'TYT Genel' },
                  { value: 'AYT_GENEL', label: 'AYT Genel' },
                  { value: 'BRANS', label: 'Branş' }
                ]} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="title" label="Başlık">
                <Input placeholder="İsteğe bağlı" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.category !== cur.category}>
                {({ getFieldValue, setFieldsValue }) => getFieldValue('category') === 'BRANS' && (
                  <Form.Item name="branchSubject" label="Branş" rules={[{ required: true, message: 'Branş' }]}>
                    <Select
                      showSearch
                      placeholder="Branş seçin"
                      options={BRANCH_SUBJECTS}
                      optionFilterProp="label"
                      onChange={() => {
                        // branş değişince yanlış konu seçimlerini sıfırla
                        setFieldsValue({ branchWrongTopics: [] });
                      }}
                    />
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="notes" label="Not">
                <Input placeholder="Kısa not" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(p, c) => p.category !== c.category}>
            {({ getFieldValue }) => {
              const cat = getFieldValue('category');
              if (cat === 'TYT_GENEL') {
                return (
                  <>
                    <Row gutter={8}>
                      {['turkce', 'sosyal', 'matematik', 'fen'].map(field => (
                        <Col span={6} key={field}>
                          <Form.Item label={field.charAt(0).toUpperCase() + field.slice(1) + ' D/Y'} style={{ marginBottom: 4 }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <Form.Item name={field + 'Correct'} style={{ marginBottom: 0 }}>
                                <Input placeholder="D" style={{ width: 40 }} type="number" min={0} />
                              </Form.Item>
                              <Form.Item name={field + 'Wrong'} style={{ marginBottom: 0 }}>
                                <Input placeholder="Y" style={{ width: 40 }} type="number" min={0} />
                              </Form.Item>
                            </div>
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                    {/* Yanlış konular seçimleri */}
                    <Row gutter={8}>
                      {[
                        { key: 'turkce', label: 'Türkçe', merge: ['turkce'] },
                        { key: 'sosyal', label: 'Sosyal', merge: ['tarih', 'cografya', 'felsefe', 'din_kultur'] },
                        { key: 'matematik', label: 'Matematik', merge: ['matematik'] },
                        { key: 'fen', label: 'Fen', merge: ['fizik', 'kimya', 'biyoloji'] }
                      ].map(sec => {
                        const topics = sec.merge.flatMap(m => SUBJECT_TOPIC_BANK[m] || []);
                        const opts = topics.map(t => ({ label: t, value: t }));
                        return (
                          <Col span={6} key={sec.key}>
                            <Form.Item name={`tytWrongTopics_${sec.key}`} label={`${sec.label} Yanlış Konular`} tooltip="Yanlış yapılan konular">
                              <Select
                                mode="tags"
                                placeholder={opts.length ? 'Seç veya yaz' : 'Konu yok'}
                                options={opts}
                                onChange={(vals) => {
                                  if (Array.isArray(vals)) {
                                    const wrongField = sec.key + 'Wrong';
                                    const currentWrong = Number(examForm.getFieldValue(wrongField)) || 0;
                                    if (vals.length > currentWrong) examForm.setFieldValue(wrongField, vals.length);
                                  }
                                }}
                              />
                            </Form.Item>
                          </Col>
                        );
                      })}
                    </Row>
                  </>
                );
              } else if (cat === 'AYT_GENEL') {
                return (
                  <>
                    <Row gutter={8}>
                      {[
                        ['edebiyat', 'Edebiyat'],
                        ['sosyal2', 'Sosyal2'],
                        ['aytmat', 'Mat'],
                        ['aytfen', 'Fen']
                      ].map(([key, label]) => (
                        <Col span={6} key={key}>
                          <Form.Item label={label + ' D/Y'} style={{ marginBottom: 4 }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <Form.Item name={key + 'Correct'} style={{ marginBottom: 0 }}>
                                <Input placeholder="D" style={{ width: 40 }} type="number" min={0} />
                              </Form.Item>
                              <Form.Item name={key + 'Wrong'} style={{ marginBottom: 0 }}>
                                <Input placeholder="Y" style={{ width: 40 }} type="number" min={0} />
                              </Form.Item>
                            </div>
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                    <Row gutter={8}>
                      {[
                        { key: 'edebiyat', label: 'Edebiyat-Sosyal1', merge: ['edebiyat', 'tarih_ayt', 'cografya_ayt', 'felsefe_ayt', 'din_kultur_ayt'] },
                        { key: 'sosyal2', label: 'Sosyal2', merge: ['tarih_ayt', 'cografya_ayt', 'felsefe_ayt', 'din_kultur_ayt'] },
                        { key: 'matematik', label: 'Matematik', merge: ['matematik_ayt'] },
                        { key: 'fen', label: 'Fen', merge: ['fizik_ayt', 'kimya_ayt', 'biyoloji_ayt'] }
                      ].map(sec => {
                        const topics = sec.merge.flatMap(m => SUBJECT_TOPIC_BANK[m] || []);
                        const opts = topics.map(t => ({ label: t, value: t }));
                        return (
                          <Col span={6} key={sec.key}>
                            <Form.Item name={`aytWrongTopics_${sec.key}`} label={`${sec.label} Yanlış Konular`} tooltip="Yanlış yapılan konular">
                              <Select
                                mode="tags"
                                placeholder={opts.length ? 'Seç veya yaz' : 'Konu yok'}
                                options={opts}
                                onChange={(vals) => {
                                  if (Array.isArray(vals)) {
                                    // ilgili wrong field: edebiyatWrong, sosyal2Wrong, aytmatWrong, aytfenWrong
                                    let wrongField = '';
                                    if (sec.key === 'edebiyat') wrongField = 'edebiyatWrong';
                                    else if (sec.key === 'sosyal2') wrongField = 'sosyal2Wrong';
                                    else if (sec.key === 'matematik') wrongField = 'aytmatWrong';
                                    else if (sec.key === 'fen') wrongField = 'aytfenWrong';
                                    const currentWrong = Number(examForm.getFieldValue(wrongField)) || 0;
                                    if (vals.length > currentWrong) examForm.setFieldValue(wrongField, vals.length);
                                  }
                                }}
                              />
                            </Form.Item>
                          </Col>
                        );
                      })}
                    </Row>
                  </>
                );
              } else if (cat === 'BRANS') {
                const branchSubject = examForm.getFieldValue('branchSubject');
                const topicKey = resolveTopicBankKey(branchSubject || '');
                const topics = SUBJECT_TOPIC_BANK[topicKey] || [];
                const topicOptions = topics.map(t => ({ label: t, value: t }));
                return (
                  <>
                    <Row gutter={8}>
                      <Col span={6}>
                        <Form.Item name="totalQuestions" label="Soru">
                          <Input type="number" min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="correctAnswers" label="Doğru">
                          <Input type="number" min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="wrongAnswers" label="Yanlış">
                          <Input type="number" min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="blankAnswers" label="Boş">
                          <Input type="number" min={0} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={24}>
                        <Form.Item name="branchWrongTopics" label="Yanlış Konular" tooltip="Yanlış yaptığınız konu başlıklarını seçin veya yazın (Enter)">
                          <Select
                            mode="tags"
                            allowClear
                            placeholder={topicOptions.length ? 'Konuları seç veya yaz' : 'Konu listesi yok, kendiniz yazın'}
                            options={topicOptions}
                            onChange={(vals) => {
                              // seçilen konu sayısı wrongAnswers'dan fazlaysa otomatik güncelle
                              if (Array.isArray(vals)) {
                                const currentWrong = Number(examForm.getFieldValue('wrongAnswers')) || 0;
                                if (vals.length > currentWrong) {
                                  examForm.setFieldValue('wrongAnswers', vals.length);
                                }
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" type="primary" loading={addingExam} onClick={addPracticeExam}>
              Deneme Kaydet
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
};

export default PracticeExams;
