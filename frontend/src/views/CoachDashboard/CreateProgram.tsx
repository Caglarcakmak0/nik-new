import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, Form, DatePicker, Select, Button, InputNumber, Input, Space, message, Row, Col, Tooltip, Skeleton, Typography, Switch, Divider, List, Segmented, Slider, theme } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, getYouTubePlaylistItems, getCoachSubjectPreferences, createCoachSubjectPreference, getCoachUsedVideos } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CreateProgramTour from '../../components/tour/CoachTour/CreateProgramTour';
import './CreateProgram.scss';

type AssignedVideo = {
  videoId: string;
  playlistId?: string;
  title: string;
  durationSeconds: number;
  channelTitle?: string;
  position?: number;
  order?: number;
};

type SubjectForm = {
  subject: string;
  description: string;
  duration: number; // targetTime (dk)
  videos?: AssignedVideo[];
};

type ProgramForm = {
  studentId: string;
  date: Dayjs;
  subjects: SubjectForm[];
};

const { Option } = Select;
const { TextArea } = Input;

const CreateProgram: React.FC = () => {
  const [form] = Form.useForm<ProgramForm>();
  const { user } = useAuth();
  const studentSelectRef = useRef<HTMLDivElement | null>(null);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const subjectsListRef = useRef<HTMLDivElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [studentOptions, setStudentOptions] = useState<{ value: string; label: string }[]>([]);
  const isStudentLocked = !!search.get('studentId');
  // YouTube integration state
  // Hoca seçimi kaldırıldı: her ders için tek playlist (preference) kullanılır
  const [ytLoading, setYtLoading] = useState(false);
  const [playlistVideos, setPlaylistVideos] = useState<any[]>([]);
  const [manualPlaylistId, setManualPlaylistId] = useState('');
  const [ytNextPageToken, setYtNextPageToken] = useState<string | null>(null);
  const [usingRealApi, setUsingRealApi] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string | null>(null); // Koç hangi dersi için video seçiyor
  const [studentPreference, setStudentPreference] = useState<any | null>(null);
  const [usedVideoIds, setUsedVideoIds] = useState<Set<string>>(new Set());
  const [hideUsed, setHideUsed] = useState<boolean>(false);
  const videoScrollRef = useRef<HTMLDivElement | null>(null);
  const [creatingPreference, setCreatingPreference] = useState(false);
  const { token } = theme.useToken();
  // Tema algısı: body üzerinde theme-dark sınıfını dinle (daha tutarlı)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => document.body.classList.contains('theme-dark'));
  useEffect(() => {
    const body = document.body;
    const update = () => setIsDarkMode(body.classList.contains('theme-dark'));
    update();
    const observer = new MutationObserver(() => update());
    observer.observe(body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  // UI enhancements state
  const [videoSearch, setVideoSearch] = useState('');
  // videoView kaldırıldı (sadece liste)
  const lockedStudentId = search.get('studentId');
  const lockedStudentLabel = useMemo(() => {
    if (!lockedStudentId) return null;
    const found = studentOptions.find(o => o.value === lockedStudentId);
    return found?.label || lockedStudentId;
  }, [lockedStudentId, studentOptions]);

  // Demo playlistler kaldırıldı; yalnızca preference playlistId veya manuel girilen ID kullanılacak

  const fetchRealPlaylist = async (playlistId: string, append = false) => {
    try {
      setYtLoading(true);
      const res: any = await getYouTubePlaylistItems(playlistId, { pageToken: append ? ytNextPageToken || undefined : undefined, maxResults: 12 });
      const vids = res?.data?.videos || [];
      setPlaylistVideos(prev => append ? [...prev, ...vids] : vids);
      setYtNextPageToken(res?.data?.nextPageToken || null);
  setUsingRealApi(true);
    } catch (e: any) {
      message.error(e.message || 'Playlist alınamadı');
    } finally {
      setYtLoading(false);
    }
  };

  const parsePlaylistInput = (raw: string): string | null => {
    if (!raw) return null;
    const val = raw.trim();
    // Try to extract list parameter from full URL
    const listMatch = val.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (listMatch) return listMatch[1];
    // If it's a /playlist URL form
    const playlistQuery = val.match(/playlist\?.*list=([A-Za-z0-9_-]+)/);
    if (playlistQuery) return playlistQuery[1];
    // If user pasted only ID (common IDs start with PL, UU, OLAK, RD etc.)
    if (/^[A-Za-z0-9_-]{10,}$/.test(val)) return val; // basic sanity length
    return null;
  };

  const addVideoToSubject = (video: any) => {
    if (!activeSubject) {
      message.warning('Önce sol taraftan bir ders seçin veya yeni ders ekleyin.');
      return;
    }
    const current: SubjectForm[] = form.getFieldValue('subjects') || [];
    let idx = current.findIndex(s => s.subject === activeSubject);
    if (idx === -1) {
      // Otomatik ekle
  current.push({ subject: activeSubject, description: '', duration: 0, videos: [] });
      idx = current.length - 1;
    }
    const subjectEntry = current[idx];
    subjectEntry.videos = subjectEntry.videos || [];
    if (subjectEntry.videos.some(v => v.videoId === video.id)) {
      message.info('Bu video zaten eklendi');
      return;
    }
    const newVid: AssignedVideo = {
      videoId: video.id,
      playlistId: manualPlaylistId || studentPreference?.playlistId,
      title: video.title,
      durationSeconds: video.durationSeconds || video.duration_seconds || 0,
      channelTitle: video.channelTitle,
      position: video.position,
      order: subjectEntry.videos.length
    };
    subjectEntry.videos.push(newVid);
    // Otomatik süre doldurma (override yoksa): toplam saniyeyi dakikaya çevir
    const totalSeconds = subjectEntry.videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);
    if (!subjectEntry.duration || subjectEntry.duration === 60) { // kaba kural: ilk default 60 ise güncelleyebiliriz
      subjectEntry.duration = Math.ceil(totalSeconds / 60) || subjectEntry.duration;
    }
    current[idx] = { ...subjectEntry };
    form.setFieldsValue({ subjects: [...current] });
  };

  const filteredVideos = useMemo(() => {
    let list = playlistVideos;
    if (videoSearch.trim()) {
      const q = videoSearch.toLowerCase();
      list = list.filter(v => (v.title || '').toLowerCase().includes(q));
    }
    if (hideUsed && usedVideoIds.size) {
      list = list.filter(v => !usedVideoIds.has(v.id));
    }
    return list.map(v => ({ ...v, _used: usedVideoIds.has(v.id) }));
  }, [playlistVideos, videoSearch, hideUsed, usedVideoIds]);

  const subjects: SubjectForm[] = Form.useWatch('subjects', form) || [];
  const totalMinutes = useMemo(() => subjects.reduce((acc, s) => acc + (s?.duration || 0), 0), [subjects]);
  const totalHoursPart = Math.floor(totalMinutes / 60);
  const totalMinsPart = totalMinutes % 60;


  const setDuration = (index: number, minutes: number) => {
    const list = [...(form.getFieldValue('subjects') || [])];
    if (!list[index]) return;
    list[index].duration = minutes;
    form.setFieldsValue({ subjects: list });
  };

  const subjectVideoMinutes = (index: number) => {
    const list: SubjectForm[] = form.getFieldValue('subjects') || [];
    const vids = list[index]?.videos || [];
    return Math.ceil(vids.reduce((s, v) => s + (v.durationSeconds || 0), 0) / 60);
  };

  const durationPresets = [25, 40, 60, 90];


  useEffect(() => {
    const studentId = search.get('studentId');
    form.setFieldsValue({
      studentId: studentId || undefined,
      date: dayjs(),
      subjects: []
    } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await apiRequest(`/coach/students?page=1&limit=1000`);
        const items = (res.data || []).map((s: any) => ({ value: s._id, label: s.fullName || s.email }));
        const studentId = search.get('studentId');
        // Seçili öğrenci listede yoksa tekil sorgu ile adını getir
        if (studentId && !items.find((it: any) => it.value === studentId)) {
          try {
            const single = await apiRequest(`/users/${studentId}`);
            const userData = single.data;
            items.unshift({ value: studentId, label: userData?.fullName || userData?.email || studentId });
            // console.log('Tekil öğrenci verisi:', userData , studentId );
            console.log('Öğrenci adı:', userData?.fullName || userData?.email || studentId);
            } catch {
            // erişilemezse ID göster
            items.unshift({ value: studentId, label: studentId });
          }
        }
        setStudentOptions(items);
      } catch (e: any) {
        // Liste alınamadığında form yine manuel ID ile çalışabilir
      } finally {
        setLoading(false);
      }
    };  
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (values: ProgramForm) => {
    try {
      const total = values.subjects.reduce((acc, s) => acc + (s.duration || 0), 0);
      const totalHours = Math.floor(total / 60);
      const totalMinutes = total % 60;
      const payload = {
        studentId: values.studentId,
        date: values.date.format('YYYY-MM-DD'),
        subjects: values.subjects.map(s => ({
          subject: s.subject,
          description: s.description,
            duration: s.duration,
            videos: s.videos?.map(v => ({
              videoId: v.videoId,
              playlistId: v.playlistId,
              title: v.title,
              durationSeconds: v.durationSeconds,
              channelTitle: v.channelTitle,
              position: v.position,
              order: v.order
            })) || []
        })),
        title: `Koç Programı - ${values.date.format('DD/MM/YYYY')}`,
      };
      await apiRequest('/coach/programs', { method: 'POST', body: JSON.stringify(payload) });
      message.success(`Program oluşturuldu! Toplam süre: ${totalHours} saat ${totalMinutes} dakika`);
      navigate('/coach/programs');
    } catch (e: any) {
      message.error(e.message || 'Program oluşturulamadı');
    }
  };

  // Kod -> Görünür Etiket eşlemesi (Türkçe karakterler ve doğru büyük harfler)
  const subjectLabel = (code?: string) => {
    switch (code) {
      case 'turkce': return 'Türkçe';
      case 'matematik': return 'Matematik';
      case 'fizik': return 'Fizik';
      case 'kimya': return 'Kimya';
      case 'biyoloji': return 'Biyoloji';
      case 'tarih': return 'Tarih';
      case 'cografya': return 'Coğrafya';
      default: return code || '';
    }
  };

  return (
    <div className="create-program">
      <Form form={form} layout="vertical" onFinish={submit}>
        {/* Önce Program Dersleri Kartı */}
        <div className="program-and-playlist-stack">
          <Card
            title={<span>Günlük Program <span style={{fontSize:12,color:'#888',fontWeight:400}}> | {subjects.length} ders, toplam {totalHoursPart>0 && `${totalHoursPart}sa `}{totalMinsPart}dk</span></span>}
            extra={
              <div className="program-head-extra">
                <Form.Item name="studentId" rules={[{ required: true, message: 'Öğrenci seçiniz' }]} style={{ marginBottom:0 }}>
                  <div ref={studentSelectRef as any}>
                    {isStudentLocked && lockedStudentId ? (
                      <span className="locked-student-label">{lockedStudentLabel}</span>
                    ) : (
                      <Select
                        showSearch
                        placeholder="Öğrenci"
                        size="small"
                        loading={loading}
                        options={studentOptions}
                        value={form.getFieldValue('studentId')}
                        onChange={(v)=>form.setFieldsValue({ studentId: v })}
                        filterOption={(input, option) => 
                          option?.label ? (option.label as string).toLowerCase().includes(input.toLowerCase()) : false
                        }
                        style={{ width: 200 }}
                      />
                    )}
                  </div>
                </Form.Item>
                <Form.Item name="date" rules={[{ required: true, message: 'Tarih seçiniz' }]} style={{ marginBottom:0 }}>
                  <div ref={datePickerRef as any}>
                    <DatePicker
                      format="DD/MM/YYYY"
                      placeholder="Tarih"
                      size="small"
                    />
                  </div>
                </Form.Item>
              </div>
            }
          >
          <Form.List name="subjects">
            {(fields, { add, remove }) => (
              <>
                <div ref={subjectsListRef as any} className="subjects-grid">
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" className="subject-item-card" title={<Space size={6}>{`Ders ${name + 1}`}{subjects[name]?.subject && <span className="subject-pill">{subjectLabel(subjects[name]?.subject)}</span>}</Space>}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Form.Item {...restField} name={[name, 'subject']} label="Ders" rules={[{ required: true, message: 'Ders seçiniz' }]}>
                        <Select placeholder="Ders seçin" onChange={async (val) => {
                          const list: SubjectForm[] = form.getFieldValue('subjects') || [];
                          list[name].subject = val;
                          form.setFieldsValue({ subjects: [...list] });
                          setActiveSubject(val);
                          const studentId = form.getFieldValue('studentId') || lockedStudentId;
                          if (studentId && val) {
                            try {
                              const prefRes = await getCoachSubjectPreferences(studentId, val);
                              const pref = prefRes.data?.[0] || null;
                              setStudentPreference(pref);
                              const usedRes = await getCoachUsedVideos(studentId, val, 120);
                              setUsedVideoIds(new Set(usedRes.data || []));
                              if (pref?.playlistId) {
                                setManualPlaylistId(pref.playlistId);
                                fetchRealPlaylist(pref.playlistId, false);
                              } else {
                                // Playlist yoksa mevcut video listesini temizle
                                setPlaylistVideos([]);
                                setYtNextPageToken(null);
                                setManualPlaylistId('');
                                setUsingRealApi(false);
                              }
                            } catch {
                              setStudentPreference(null);
                            }
                          } else {
                            setStudentPreference(null);
                          }
                        }}>
                          <Option value="matematik">📐 Matematik</Option>
                          <Option value="turkce">📚 Türkçe</Option>
                          <Option value="kimya">🧪 Kimya</Option>
                          <Option value="fizik">🔬 Fizik</Option>
                          <Option value="biyoloji">🌱 Biyoloji</Option>
                          <Option value="tarih">📖 Tarih</Option>
                          <Option value="cografya">🌍 Coğrafya</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'description']} label="Konu Açıklaması" rules={[{ required: true, message: 'Açıklama giriniz' }]}>
                        <TextArea rows={2} placeholder="Kısa açıklama" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'duration']} label="Süre (dk)" rules={[{ required: true, message: 'Süre giriniz' }]}
                        style={{ marginBottom: 4 }}
                      >
                        <InputNumber min={15} max={480} step={15} style={{ display:'none' }} />
                        <div className="duration-picker">
                          <Segmented
                            size="small"
                            value={durationPresets.includes(subjects[name]?.duration) ? subjects[name]?.duration : 'Özel'}
                            onChange={(val)=>{
                              if (val === 'Özel') return; // slider kontrol eder
                              setDuration(name, Number(val));
                            }}
                            options={[...durationPresets.map(v => ({ label: v + ' dk', value: v })), { label:'Özel', value:'Özel' }]}
                          />
                          <div className="duration-slider-row">
                            <Slider
                              min={15}
                              max={480}
                              step={15}
                              tooltip={{ formatter: (v)=> v + ' dk' }}
                              value={subjects[name]?.duration || 60}
                              onChange={(v)=> setDuration(name, Number(v)) }
                              className={durationPresets.includes(subjects[name]?.duration) ? 'is-preset' : 'is-custom'}
                            />
                            <div className="duration-numbers">
                              <span className="duration-current">{subjects[name]?.duration || 0} dk</span>
                              <span className="duration-videos">Video Toplamı: {subjectVideoMinutes(name)} dk</span>
                              {subjects[name]?.duration ? (
                                <span className="duration-diff">
                                  {(subjectVideoMinutes(name) - (subjects[name]?.duration||0)) === 0 ? 'Tam uyum' : (subjectVideoMinutes(name) > (subjects[name]?.duration||0) ? '+' : '') + (subjectVideoMinutes(name) - (subjects[name]?.duration||0)) + ' dk'}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Form.Item>
                      {subjects[name]?.videos && subjects[name].videos!.length > 0 && (
                        <Card size="small" style={{ background:'#f5f5f5' }} title={<span style={{ fontSize:12 }}>Atanan Videolar ({subjects[name].videos!.length})</span>} bodyStyle={{ padding:8 }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            {subjects[name].videos!.sort((a,b)=> (a.order||0)-(b.order||0)).map(v => (
                              <div key={v.videoId} style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', fontSize:11 }}>
                                <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.title}</span>
                                <span style={{ color:'#888' }}>{Math.ceil((v.durationSeconds||0)/60)} dk</span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                      <div>
                        <Button danger onClick={() => remove(name)}>Dersi Kaldır</Button>
                      </div>
                    </Space>
                  </Card>
                ))}
                </div>
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ subject: '', description: '', duration: 60 })} block>
                    + Yeni Ders Ekle
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => navigate(-1)}>İptal</Button>
              <Button ref={submitBtnRef as any} type="primary" htmlType="submit" size="large">Program Oluştur</Button>
            </Space>
          </div>
          </Card>

          {/* YouTube Kaynakları Kartı Alta Alındı */}
          <Card
            bordered={false}
            className={`playlist-card ${isDarkMode ? 'is-dark' : 'is-light'}`}
            bodyStyle={{ padding:0, display:'flex', flexDirection:'column', height:'100%' }}
            title={
              <Space size={10} wrap>
                <span className="playlist-head-label">YouTube Kaynakları</span>
                {activeSubject && <span className="pill pill-subject">{subjectLabel(activeSubject)}</span>}
                {studentPreference?.playlistId && <span className="pill pill-saved">Kayıtlı</span>}
              </Space>
            }
            extra={
              <Tooltip title={hideUsed? 'Kullanılmış videoları göster' : 'Kullanılmış videoları gizle'}>
                <Switch size="small" checked={hideUsed} onChange={v=>setHideUsed(v)} />
              </Tooltip>
            }
          >
            <div className="playlist-card-body">
              <Row gutter={12}>
                <Col span={24}>
                  <Input
                    allowClear
                    size="middle"
                    placeholder="Playlist URL veya ID (Enter ile getir & kaydet)"
                    value={manualPlaylistId}
                    disabled={creatingPreference}
                    onChange={(e) => setManualPlaylistId(e.target.value.trim())}
                    onPressEnter={async (e) => {
                      const val = (e.target as HTMLInputElement).value;
                      const pid = parsePlaylistInput(val);
                      if (!pid) { message.error('Geçersiz playlist'); return; }
                      setManualPlaylistId(pid);
                      fetchRealPlaylist(pid, false);
                      const studentId = form.getFieldValue('studentId') || lockedStudentId;
                      if (studentId && activeSubject) {
                        setCreatingPreference(true);
                        try {
                          const res: any = await createCoachSubjectPreference({ studentId, subject: activeSubject, playlistId: pid });
                          setStudentPreference(res.data || { playlistId: pid, subject: activeSubject });
                          message.success('Playlist kaydedildi');
                        } catch (e: any) {
                          // 409 benzeri durumlarda sessiz geç
                        } finally { setCreatingPreference(false); }
                      }
                    }}
                  ></Input>
                </Col>
              </Row>
              {!studentPreference?.playlistId && (
                <div className={`playlist-info-box ${isDarkMode ? 'dark' : 'light'}`}>
                  Bu ders için kayıtlı playlist yok. URL veya ID girip Enter'a basınca kaydedilir.
                </div>
              )}
              <Divider className="playlist-divider" />
              <Input allowClear placeholder="Video ara..." value={videoSearch} onChange={e=>setVideoSearch(e.target.value)} size="middle" className="video-search-input" />
              {usingRealApi && <span className="pill pill-mode">playlist</span>}
              <div className="video-list-wrapper">
                <div ref={videoScrollRef} className="video-scroll"
                  onScroll={(e)=>{
                    const el = e.currentTarget;
                    if (!usingRealApi) return;
                    if (ytLoading) return;
                    if (!ytNextPageToken) return;
                    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
                      fetchRealPlaylist(manualPlaylistId, true);
                    }
                  }}
                >
                {ytLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : filteredVideos.length === 0 ? (
                  <div style={{ textAlign:'center', padding:24 }}>
                    <Typography.Text type="secondary">Video yok</Typography.Text>
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={filteredVideos}
                    className="video-list"
                    renderItem={(v:any) => (
                      <List.Item className="video-list-row">
                        <div className={`video-item ${v._used ? 'is-used' : ''} ${isDarkMode ? 'dark' : 'light'}`}
                          onClick={()=> !v._used && addVideoToSubject(v)}
                        >
                          <div className="video-thumb-wrapper">
                            <img src={v.thumbnail} alt={v.title} className="video-thumb" />
                            <span className="video-duration-badge">{v.duration}</span>
                          </div>
                          <div className="video-meta">
                            <Tooltip title={v.title}>
                              <Typography.Text className="video-title">{v.title}</Typography.Text>
                            </Tooltip>
                            {v._used && (
                              <span className="video-used-badge">• kullanıldı</span>
                            )}
                          </div>
                          <div className="video-actions">
                            <Button
                              type="primary"
                              icon={<PlusCircleOutlined />}
                              size="small"
                              className="video-add-btn"
                              onClick={(e)=>{e.stopPropagation(); addVideoToSubject(v);}}
                              disabled={v._used}
                            >Ekle</Button>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Form>

      <CreateProgramTour
        userId={user?._id}
        targets={{
          getStudentSelectEl: () => (studentSelectRef.current as any) || null,
          getDatePickerEl: () => (datePickerRef.current as any) || null,
          getSubjectsListEl: () => (subjectsListRef.current as any) || null,
          getSubmitButtonEl: () => (submitBtnRef.current as any) || null,
        }}
      />
    </div>
  );
};

export default CreateProgram;


