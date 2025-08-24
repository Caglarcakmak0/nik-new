import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Select, Space, Button, Typography, Popover, Divider, message, Spin } from 'antd';
const { Option } = Select;
import { SUBJECT_TOPIC_BANK } from '../../constants/subjectTopics';
import { PRESET_COLORS, PRESET_COLORS_DARK, KEYBOARD_COLOR_MAP, KEYBOARD_COLOR_MAP_DARK, SUBJECT_LABELS, resolveGroup } from './bones/constants';
import { useLocalMap } from './bones/useLocalMap';
import ColorCell from './bones/ColorCell';
import { useAuth, useIsCoach, useIsStudent, useIsAdmin } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { apiRequest } from '../../services/api';
import './TopicMatrix.scss';

const { Text } = Typography;

type SubjectKey = keyof typeof SUBJECT_TOPIC_BANK;

interface Student {
  _id: string;
  fullName: string;
  email: string;
  grade?: number;
}
function buildSubjectOptions() {
  const keys = Object.keys(SUBJECT_TOPIC_BANK) as SubjectKey[];
  return keys.map((k) => ({
    value: k,
    label: `${resolveGroup(k)} - ${SUBJECT_LABELS[k] || k}`
  }));
}

const TopicMatrix: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const isCoach = useIsCoach();
  const isStudent = useIsStudent();
  const isAdmin = useIsAdmin();
  // Free öğrenciler kendi matrislerini düzenleyebilsin (self-tracking). Admin & koç zaten düzenleyebilir.
  const isStudentFree = isStudent && (user?.plan?.tier as any) === 'free';
  const canEdit = isCoach || isAdmin || isStudentFree;
  const canSelectSubject = isCoach || isAdmin || isStudent; // Öğrenciler ders seçebilir
  
  const subjectOptions = useMemo(() => buildSubjectOptions(), []);
  const [subject, setSubject] = useState<SubjectKey>('matematik');
  const [dayCount, setDayCount] = useState<number>(30);
  
  // Coach-specific state
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Multi-select state
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // Local cell color map (persisted localStorage per user/subject)
  const { map, setMap, clear } = useLocalMap(subject, user?._id, selectedStudentId);

  // Track remote load state & debounce timer
  const hasLoadedRemoteRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const isLoadingRemoteRef = useRef(false);
  const lastSavedSignatureRef = useRef<string>('');

  // Column colors state  
  const [columnColors, setColumnColors] = useState<Record<number, string>>({});

  const clearColumnColors = () => {
    setColumnColors({});
    try {
      const effectiveUserId = selectedStudentId || user?._id;
      const storageKey = effectiveUserId 
        ? `topic_column_colors_v1_${subject}_${effectiveUserId}` 
        : `topic_column_colors_v1_${subject}`;
      localStorage.removeItem(storageKey);
    } catch (_) {
      // no-op
    }
  };

  const clearTopicColors = () => {
    setTopicColors({});
    try {
      const effectiveUserId = selectedStudentId || user?._id;
      const storageKey = effectiveUserId 
        ? `topic_name_colors_v1_${subject}_${effectiveUserId}` 
        : `topic_name_colors_v1_${subject}`;
      localStorage.removeItem(storageKey);
    } catch (_) {
      // no-op
    }
  };

  // Topic colors state (for the left column with topic names)
  const [topicColors, setTopicColors] = useState<Record<number, string>>({});

  // Load column colors when student or subject changes
  useEffect(() => {
    try {
      const effectiveUserId = selectedStudentId || user?._id;
      const storageKey = effectiveUserId 
        ? `topic_column_colors_v1_${subject}_${effectiveUserId}` 
        : `topic_column_colors_v1_${subject}`;
      const raw = localStorage.getItem(storageKey);
      setColumnColors(raw ? (JSON.parse(raw) as Record<number, string>) : {});
    } catch (_) {
      setColumnColors({});
    }
  }, [subject, user?._id, selectedStudentId]);

  // Load topic colors when student or subject changes
  useEffect(() => {
    try {
      const effectiveUserId = selectedStudentId || user?._id;
      const storageKey = effectiveUserId 
        ? `topic_name_colors_v1_${subject}_${effectiveUserId}` 
        : `topic_name_colors_v1_${subject}`;
      const raw = localStorage.getItem(storageKey);
      setTopicColors(raw ? (JSON.parse(raw) as Record<number, string>) : {});
    } catch (_) {
      setTopicColors({});
    }
  }, [subject, user?._id, selectedStudentId]);

  // Save column colors to localStorage
  useEffect(() => {
    try {
      const effectiveUserId = selectedStudentId || user?._id;
      const storageKey = effectiveUserId 
        ? `topic_column_colors_v1_${subject}_${effectiveUserId}` 
        : `topic_column_colors_v1_${subject}`;
      localStorage.setItem(storageKey, JSON.stringify(columnColors));
    } catch (_) {
      // no-op
    }
  }, [columnColors, subject, user?._id, selectedStudentId]);

  // Save topic colors to localStorage
  useEffect(() => {
    try {
      const effectiveUserId = selectedStudentId || user?._id;
      const storageKey = effectiveUserId 
        ? `topic_name_colors_v1_${subject}_${effectiveUserId}` 
        : `topic_name_colors_v1_${subject}`;
      localStorage.setItem(storageKey, JSON.stringify(topicColors));
    } catch (_) {
      // no-op
    }
  }, [topicColors, subject, user?._id, selectedStudentId]);

  // Fetch students for coaches
  const fetchStudents = async () => {
    if (!isCoach) return;
    
    try {
      setLoading(true);
      const response = await apiRequest('/coach/students');
      const data = response.data || [];
      setStudents(data);
      
      // Auto-select first student if available
      if (data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data[0]._id);
      }
    } catch (error: any) {
      message.error('Öğrenciler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCoach) {
      fetchStudents();
    }
  }, [isCoach]);

  // MIGRATION: Eski anahtar (kullanıcı ID'siz) verisini kullanıcı giriş yaptıktan sonra taşı
  useEffect(() => {
    if (!user?._id) return;
    const oldKey = `topic_color_matrix_v1_${subject}`; // eski generic anahtar
    const newKey = `topic_color_matrix_v1_${subject}_${user._id}`;
    try {
      const oldData = localStorage.getItem(newKey) || localStorage.getItem(oldKey);
      if (oldData) {
        // Eğer yeni anahtar boşsa migrate et
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, oldData);
        }
        if (oldKey !== newKey) {
          localStorage.removeItem(oldKey);
        }
      }
    } catch (_) { /* no-op */ }
  }, [user?._id, subject]);

  // Remote'dan yükle (öğrenci kendi verisi veya koç seçili öğrencisi). Free öğrenciler dahil
  useEffect(() => {
    const shouldLoad = (isStudent || isCoach || isAdmin) && (isStudent ? !!user?._id : true);
    if (!shouldLoad) return;
    const targetUserId = isCoach && selectedStudentId ? selectedStudentId : (user?._id || '');
    if (!targetUserId) return;
    const controller = new AbortController();
    const load = async () => {
      isLoadingRemoteRef.current = true;
      try {
        const res = await apiRequest(`/topic-matrix/${targetUserId}/${subject}`, { signal: controller.signal });
        if (res?.data) {
          const remote = res.data;
          // Remote cellColors Map -> object
          const cellColors: Record<string, string> = remote.cellColors || {};
          const colColors: Record<number, string> = remote.columnColors || {};
          const tColors: Record<number, string> = remote.topicColors || {};
          setMap(cellColors);
          setColumnColors(colColors);
          setTopicColors(tColors);
          if (remote.dayCount && remote.dayCount !== dayCount) setDayCount(remote.dayCount);
          hasLoadedRemoteRef.current = true;
          // Save signature
          lastSavedSignatureRef.current = JSON.stringify({ cellColors, colColors, tColors, dayCount: remote.dayCount });
        }
      } catch (err: any) {
        // 404 ise sorun değil, yeni oluşturulacak
      } finally {
        isLoadingRemoteRef.current = false;
      }
    };
    load();
    return () => controller.abort();
  }, [subject, selectedStudentId, isCoach, isStudent, isAdmin, user?._id]);

  // Debounced auto-save (öğrenci kendi düzenlemesi, koç öğrenci düzenlemesi, admin)
  useEffect(() => {
    if (!canEdit) return; // düzenleme izni yoksa kaydetme
    const targetUserId = isCoach && selectedStudentId ? selectedStudentId : user?._id;
    if (!targetUserId) return;
    // Remote yükleme bitmeden kaydetme (ilk fetch'i bekle)
    if (!hasLoadedRemoteRef.current && !isLoadingRemoteRef.current) {
      // Yüklenemediyse (örn. 404) yine de kaydetmeye izin ver ama bir kere map değişsin
    }
    const signature = JSON.stringify({ map, columnColors, topicColors, dayCount });
    if (signature === lastSavedSignatureRef.current) return; // değişiklik yok
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const payload = {
          userId: targetUserId,
            subject,
            dayCount,
            topics: SUBJECT_TOPIC_BANK[subject] || [],
            cellColors: map,
            columnColors,
            topicColors
        };
        await apiRequest('/topic-matrix', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        lastSavedSignatureRef.current = signature;
        // İlk başarılı kayıtta kısa bilgi mesajı
        if (!hasLoadedRemoteRef.current) {
          message.success('Konu matrisi kaydedildi');
          hasLoadedRemoteRef.current = true;
        }
      } catch (e: any) {
        // Sessiz; arada hata olursa kullanıcıyı boğmayalım
      }
    }, 600); // 600ms debounce
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [map, columnColors, topicColors, dayCount, subject, selectedStudentId, canEdit, isCoach, user?._id]);

  // Define color application functions
  const applyColorToSelectedCells = (colorHex: string) => {
    if (selectedCells.size === 0) return;
    
    setMap(prev => {
      const next = { ...prev };
      selectedCells.forEach(key => {
        next[key] = colorHex;
      });
      return next;
    });
    
    setSelectedCells(new Set());
    setIsMultiSelectMode(false);
  };

  const clearSelection = () => {
    setSelectedCells(new Set());
    setIsMultiSelectMode(false);
  };

  // Keyboard shortcuts for color assignment (disabled for non-editors)
  useEffect(() => {
    if (!canEdit) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const colorMap = isDark ? KEYBOARD_COLOR_MAP_DARK[key] : KEYBOARD_COLOR_MAP[key];
      
      if (colorMap && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Check if we're not typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        e.preventDefault();
        
        if (selectedCells.size > 0) {
          // Apply color to selected cells
          applyColorToSelectedCells(colorMap.color);
          message.success(`${colorMap.label} rengi ${selectedCells.size} hücreye uygulandı`);
        } else {
          message.info(`${key.toUpperCase()} tuşu: ${colorMap.label} - Önce bir hücre seçin. Çoklu seçim için Shift + tıklayın.`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isMultiSelectMode, selectedCells, applyColorToSelectedCells, canEdit]);

  useEffect(() => {
    if (dayCount < 1 || dayCount > 60) {
      setDayCount(30);
    }
  }, [dayCount]);

  const topics = SUBJECT_TOPIC_BANK[subject] || [];
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  const headerLabel = useMemo(() => {
    const group = resolveGroup(subject);
    const label = SUBJECT_LABELS[subject] || String(subject);
    let userInfo = '';
    
    if (isCoach && selectedStudentId) {
      const student = students.find(s => s._id === selectedStudentId);
      userInfo = student ? ` - ${student.fullName || student.email}` : '';
    } else if (isStudent && user) {
      userInfo = ` - ${user.fullName}`;
    }
    
    return `Ders: ${group} - ${label}${userInfo}`;
  }, [subject, isCoach, isStudent, selectedStudentId, students, user]);

  const getKey = (rowIndex: number, day: number) => `${rowIndex}:${day}`;

  const setCellColor = (rowIndex: number, day: number, colorHex: string) => {
    const key = getKey(rowIndex, day);
    setMap((prev) => ({ ...prev, [key]: colorHex }));
  };

  const handleCellSelect = (rowIndex: number, day: number, isShiftClick: boolean) => {
    const key = getKey(rowIndex, day);
    
    if (isShiftClick) {
      setIsMultiSelectMode(true);
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    } else {
      // Tek tıklamada tek hücre seçimi aktif kalsın
      setSelectedCells(new Set([key]));
      setIsMultiSelectMode(false);
    }
  };

  // (Row/column bulk fill helpers removed as unused after simplifying free student editing scenario)

  const setTopicColor = (topicIndex: number, colorHex: string) => {
    setTopicColors((prev) => ({ ...prev, [topicIndex]: colorHex }));
  };

  const exportJson = () => {
    try {
      let userInfo = '';
      let fileName = `konu-matrisi-${subject}`;
      
      if (isCoach && selectedStudentId) {
        const student = students.find(s => s._id === selectedStudentId);
        if (student) {
          userInfo = student.fullName || student.email;
          fileName += `-${(student.fullName || student.email).replace(/\s+/g, '-')}`;
        }
      } else if (isStudent && user) {
        userInfo = user.fullName;
        fileName += `-${user.fullName.replace(/\s+/g, '-')}`;
      }
      
      const payload = {
        subject,
        dayCount,
        topics,
        map,
        columnColors,
        topicColors,
        user: userInfo,
        exportDate: new Date().toISOString(),
        exportedBy: user?.fullName || 'Unknown'
      };
      
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      message.error(e?.message || 'Dışa aktarılamadı');
    }
  };

  return (
    <div className="tmx-container">
      <Card
        extra={
          <Space wrap>
            {isCoach && (
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Öğrenci seçin"
                style={{ width: 200 }}
                value={selectedStudentId}
                loading={loading}
                onChange={setSelectedStudentId}
                options={students.map(student => ({
                  value: student._id,
                  label: `${student.fullName || student.email}${student.grade ? ` (${student.grade}. sınıf)` : ''}`
                }))}
                disabled={students.length === 0}
                notFoundContent={loading ? <Spin size="small" /> : 'Öğrenci bulunamadı'}
              />
            )}
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 200 }}
              value={subject}
              options={subjectOptions}
              onChange={(v) => setSubject(v as SubjectKey)}
              disabled={!canSelectSubject}
            />
            <Select
              style={{ width: 200 }}
              value={dayCount}
              onChange={(v) => setDayCount(Number(v || 30))}
              disabled={!canSelectSubject}
              placeholder="Gün seçin"
            >
              <Option value={28}>28 Gün</Option>
              <Option value={30}>30 Gün</Option>
              <Option value={31}>31 Gün</Option>
            </Select>

            {canEdit && (
              <Button onClick={() => { clear(); clearColumnColors(); clearTopicColors(); }}>Temizle (Yerel)</Button>
            )}
            <Button onClick={exportJson}>Dışa Aktar</Button>
            {canEdit && (
              <Popover
                title="Klavye Kısayolları"
                trigger="hover"
                content={
                  <div style={{ fontSize: '12px' }}>
                    {Object.entries(isDark ? KEYBOARD_COLOR_MAP_DARK : KEYBOARD_COLOR_MAP).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '2px 6px', 
                          borderRadius: '3px', 
                          fontWeight: 'bold',
                          minWidth: '20px',
                          textAlign: 'center'
                        }}>
                          {key.toUpperCase()}
                        </span>
                        <div 
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            backgroundColor: value.color, 
                            border: '1px solid #ccc',
                            borderRadius: '2px'
                          }} 
                        />
                        <span>{value.label}</span>
                      </div>
                    ))}
                  </div>
                }
              >
                <Button title="Klavye kısayolları">Kısayollar</Button>
              </Popover>
            )}
            {canEdit && isMultiSelectMode && (
              <>
                <Text strong style={{ color: '#1677ff' }}>
                  {selectedCells.size} hücre seçili
                </Text>
                <Popover
                  title="Seçili hücrelere renk uygula"
                  trigger="click"
                  content={
                    <div className="tmx-color-grid">
                      {(isDark ? PRESET_COLORS_DARK : PRESET_COLORS).map((c) => (
                        <button
                          key={c}
                          className="tmx-color-swatch"
                          style={{ backgroundColor: c }}
                          onClick={() => applyColorToSelectedCells(c)}
                          title={`Seçili ${selectedCells.size} hücreye uygula`}
                        />
                      ))}
                    </div>
                  }
                  overlayStyle={{ width: 220 }}
                >
                  <Button type="primary">Renk Uygula</Button>
                </Popover>
                <Button onClick={clearSelection}>Seçimi İptal</Button>
              </>
            )}
          </Space>
        }
      >
        {isCoach && !selectedStudentId ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Konu takibini görüntülemek için lütfen bir öğrenci seçin.
            </Text>
          </div>
        ) : (
        <div className="tmx-scroll">
          <div
            className="tmx-grid"
            style={{
              gridTemplateColumns: `260px repeat(${days.length}, 32px)`
            }}
          >
            <div className="tmx-header tmx-left-sticky">
              <Text strong>{headerLabel}</Text>
            </div>
            {days.map((d) => (
              <div key={`h-${d}`} className="tmx-header tmx-top-sticky" style={{ backgroundColor: columnColors[d] || (isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgb(244, 246, 250)') }}>
                <Space direction="vertical" size={4} style={{ alignItems: 'center' }}>
                  <Text strong>{d}</Text>
                </Space>
              </div>
            ))}

            {topics.map((topic, rowIndex) => (
              <React.Fragment key={`r-${rowIndex}`}>
                <div 
                  className="tmx-topic tmx-left-sticky" 
                  style={{ 
                    backgroundColor: topicColors[rowIndex], 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: canEdit ? 'pointer' : 'default'
                  }}
                  onClick={canEdit ? () => {
                    // Konu rengi seçimi için popover açılacak
                    const popover = document.createElement('div');
                    popover.className = 'tmx-color-popover';
                    popover.style.cssText = `
                      position: fixed;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      background: white;
                      border: 1px solid #ccc;
                      border-radius: 8px;
                      padding: 16px;
                      z-index: 1000;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    `;
                    
                    const colorGrid = document.createElement('div');
                    colorGrid.className = 'tmx-color-grid';
                    colorGrid.style.cssText = `
                      display: grid;
                      grid-template-columns: repeat(3, 1fr);
                      gap: 8px;
                    `;
                    
                    (isDark ? PRESET_COLORS_DARK : PRESET_COLORS).forEach((c) => {
                      const button = document.createElement('button');
                      button.className = 'tmx-color-swatch';
                      button.style.cssText = `
                        width: 32px;
                        height: 32px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        background-color: ${c};
                        cursor: pointer;
                      `;
                      button.onclick = () => {
                        setTopicColor(rowIndex, c);
                        // Popover'ın hala DOM'da olup olmadığını kontrol et
                        if (document.body.contains(popover)) {
                          document.body.removeChild(popover);
                        }
                      };
                      colorGrid.appendChild(button);
                    });
                    
                    popover.appendChild(colorGrid);
                    document.body.appendChild(popover);
                    
                    // Popover dışına tıklandığında kapat
                    const closePopover = (e: MouseEvent) => {
                      if (!popover.contains(e.target as Node)) {
                        // Popover'ın hala DOM'da olup olmadığını kontrol et
                        if (document.body.contains(popover)) {
                          document.body.removeChild(popover);
                        }
                        document.removeEventListener('click', closePopover);
                      }
                    };
                    setTimeout(() => document.addEventListener('click', closePopover), 100);
                  } : undefined}
                >
                  <Text>{topic || 'Konu Bulunamadı'}</Text>
                </div>
                {days.map((d) => (
                  <ColorCell
                    key={`c-${rowIndex}-${d}`}
                    color={map[getKey(rowIndex, d)]}
                    onChange={(hex) => setCellColor(rowIndex, d, hex)}
                    rowIndex={rowIndex}
                    day={d}
                    isSelected={selectedCells.has(getKey(rowIndex, d))}
                    onSelect={handleCellSelect}
                    isReadOnly={!canEdit}
                    presetColors={isDark ? PRESET_COLORS_DARK : PRESET_COLORS}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        )}
        <Divider />
        <Text type="secondary">
          <div style={{ marginBottom: '8px' }}>
            <strong>Kullanım:</strong> {canEdit ? 'Hücreye tıklayarak renk seçin. "Satır Rengi" ile tüm satırı, "Konu Rengi" ile konu arka planını, sütun başlığındaki "Renk" ile sütunu renklendirebilirsiniz.' : 'Konu takibini görüntüleyebilirsiniz. Düzenleme yetkiniz bulunmamaktadır.'}
          </div>
          {canEdit && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <strong>Çoklu Seçim:</strong> Shift + tıklama ile birden fazla hücre seçebilirsiniz. Seçili hücrelere toplu olarak renk uygulayabilirsiniz.
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Klavye Kısayolları:</strong> Q-W-E-R-T-Y tuşları ile seçili hücrelere hızlıca renk uygulayabilirsiniz. Kısayollar butonuna tıklayarak renk eşleştirmelerini görebilirsiniz.
              </div>
            </>
          )}
          <div>
            {isCoach ? 
              'Koç olarak seçilen öğrenciye özel veriler görüntülenir ve saklanır.' : 
              isAdmin ?
                'Admin olarak tüm veriler görüntülenir ve düzenlenebilir.' :
              isStudent ?
                'Öğrenci olarak sadece kendi verilerinizi görüntüleyebilirsiniz.' :
                'Verileriniz size özel olarak bu cihazda yerel olarak saklanır.'
            }
          </div>
        </Text>
      </Card>
    </div>
  );
};

export default TopicMatrix;


