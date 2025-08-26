import React, { useState, useEffect } from 'react';
import './SessionSetup.scss';
import { 
  Modal, 
  Form, 
  Select, 
  InputNumber, 
  Row, 
  Col, 
  Space,
  Typography,
  Radio,
  Divider,
  Button,
  Card,
  Tag
} from 'antd';
import { 
  ClockCircleOutlined,
  BookOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export interface StudySessionConfig {
  technique: 'Pomodoro' | 'Stopwatch' | 'Timeblock' | 'Freeform';
  subject: string;
  studyDuration: number; // dakika
  breakDuration: number; // dakika (Pomodoro için)
  targetSessions: number; // cycle sayısı
  longBreakInterval?: number; // kaç pomodoro sonra uzun mola
  longBreakDuration?: number; // uzun mola süresi
}

interface SessionSetupProps {
  /** Modal görünür mü */
  visible: boolean;
  /** Modal kapanma callback */
  onCancel: () => void;
  /** Ayarlar onaylandığında callback */
  onConfirm: (config: StudySessionConfig) => void;
  /** İlk değerler */
  initialConfig?: Partial<StudySessionConfig>;
  /** Koç programı modu - sadece teknik seçilebilir */
  coachMode?: boolean;
  /** Koç programı detayları */
  coachProgram?: {
    subject: string;
    duration: number;
    description: string;
  };
}

// Ders seçenekleri (StudySession model'den)
const SUBJECTS = [
  { value: 'matematik', label: '🔢 Matematik', category: 'TYT' },
  { value: 'geometri', label: '📐 Geometri', category: 'TYT' },
          { value: 'turkce', label: 'Türkçe', category: 'TYT' },
          { value: 'tarih', label: 'Tarih', category: 'TYT' },
  { value: 'cografya', label: '🌍 Coğrafya', category: 'TYT' },
  { value: 'felsefe', label: '💭 Felsefe', category: 'TYT' },
  { value: 'fizik', label: '⚡ Fizik', category: 'TYT' },
  { value: 'kimya', label: '🧪 Kimya', category: 'TYT' },
  { value: 'biyoloji', label: '🧬 Biyoloji', category: 'TYT' },
  { value: 'matematik_ayt', label: '🔢 Matematik AYT', category: 'AYT' },
  { value: 'fizik_ayt', label: '⚡ Fizik AYT', category: 'AYT' },
  { value: 'kimya_ayt', label: '🧪 Kimya AYT', category: 'AYT' },
  { value: 'biyoloji_ayt', label: '🧬 Biyoloji AYT', category: 'AYT' },
          { value: 'edebiyat', label: 'Edebiyat', category: 'AYT' },
          { value: 'tarih_ayt', label: 'Tarih AYT', category: 'AYT' },
  { value: 'cografya_ayt', label: '🌍 Coğrafya AYT', category: 'AYT' },
  { value: 'ingilizce', label: '🇺🇸 İngilizce', category: 'YDT' },
  { value: 'almanca', label: '🇩🇪 Almanca', category: 'YDT' },
  { value: 'fransizca', label: '🇫🇷 Fransızca', category: 'YDT' },
  { value: 'genel_tekrar', label: '🔄 Genel Tekrar', category: 'Diğer' },
          { value: 'deneme_sinavi', label: 'Deneme Sınavı', category: 'Diğer' },
          { value: 'diger', label: 'Diğer', category: 'Diğer' }
];


// Technique açıklamaları
const TECHNIQUE_INFO = {
  'Pomodoro': {
    icon: '🍅',
    description: '25 dakika çalışma + 5 dakika mola döngüsü',
    benefits: ['Odaklanmayı artırır', 'Yorgunluğu azaltır', 'İlerleyi ölçer'],
    default: { study: 25, break: 5, sessions: 4 }
  },
  'Timeblock': {
    icon: '📅',
    description: 'Belirli süre için kesintisiz çalışma',
    benefits: ['Derin odaklanma', 'Akış halini korur', 'Büyük görevler için ideal'],
    default: { study: 45, break: 15, sessions: 3 }
  },
  'Stopwatch': {
            icon: '',
    description: 'Süre takibi yaparak serbest çalışma',
    benefits: ['Esneklik', 'Doğal ritim', 'Baskı hissi yok'],
    default: { study: 60, break: 10, sessions: 2 }
  },
  'Freeform': {
    icon: '🎭',
    description: 'Tamamen serbest, sadece kayıt tutma',
    benefits: ['Tam özgürlük', 'Kendi tempon', 'Stressiz'],
    default: { study: 30, break: 5, sessions: 1 }
  }
};

// Hızlı süre seçenekleri
const QUICK_TIMES = [15, 20, 25, 30, 45, 60, 90];

// Pomodoro şablonları (çalışma/mola)
const POMODORO_PRESETS = [
  { study: 25, break: 5, label: '25/5' },
  { study: 45, break: 15, label: '45/15' },
  { study: 50, break: 10, label: '50/10' }
];

const SessionSetup: React.FC<SessionSetupProps> = ({
  visible,
  onCancel,
  onConfirm,
  initialConfig,
  coachMode = false,
  coachProgram
}) => {
  const [form] = Form.useForm();
  const [selectedTechnique, setSelectedTechnique] = useState<string>('Pomodoro');
  
  // Form values'ları watch et
  const studyDuration = Form.useWatch('studyDuration', form);

  // Form başlangıç değerleri
  useEffect(() => {
    if (visible) {
      let defaultConfig;
      
      if (coachMode && coachProgram) {
        // Koç modu: sadece teknik seçilebilir, diğerleri önceden belirlenmis
        defaultConfig = {
          technique: 'Freeform', // Koç programları için genelde serbest mod
          subject: coachProgram.subject,
          studyDuration: coachProgram.duration,
          breakDuration: 0,
          targetSessions: 1,
          longBreakInterval: 4,
          longBreakDuration: 15,
          ...initialConfig
        };
      } else {
        // Normal mod: tüm ayarlar seçilebilir
        defaultConfig = {
          technique: 'Pomodoro',
          subject: 'matematik',
          studyDuration: 25,
          breakDuration: 5,
          targetSessions: 1,
          longBreakInterval: 4,
          longBreakDuration: 15,
          ...initialConfig
        };
      }
      
      form.setFieldsValue(defaultConfig);
      setSelectedTechnique(defaultConfig.technique as string);
    }
  }, [visible, initialConfig, coachMode, coachProgram, form]);

  // Technique değiştiğinde varsayılan değerleri güncelle
  const handleTechniqueChange = (technique: string) => {
    setSelectedTechnique(technique);
    
    if (!coachMode) {
      // Normal modda varsayılan değerleri güncelle
      const defaults = TECHNIQUE_INFO[technique as keyof typeof TECHNIQUE_INFO].default;
      
      form.setFieldsValue({
        studyDuration: defaults.study,
        breakDuration: technique === 'Pomodoro' ? defaults.break : 0,
        targetSessions: 1
      });
    } else {
      // Koç modunda sadece mola ve oturum sayısını güncelle, süre koçtan geliyor
      if (technique === 'Pomodoro') {
        // Varsayılan şablon 25/5
        form.setFieldsValue({ studyDuration: 25, breakDuration: 5, targetSessions: 1 });
      } else {
        form.setFieldsValue({ breakDuration: 0, targetSessions: 1 });
      }
    }
  };

  // Hızlı süre seçimi
  const handleQuickTime = (duration: number) => {
    form.setFieldValue('studyDuration', duration);
  };

  // Modal kapatılırken form'u resetle
  const handleCancel = () => {
    form.resetFields();
    setSelectedTechnique('Pomodoro');
    onCancel();
  };

  // Form onaylandığında
  const handleConfirm = async () => {
    try {
      let values;
      
      if (coachMode && coachProgram) {
        // Koç modunda manuel değer oluştur
        values = {
          technique: form.getFieldValue('technique'),
          subject: coachProgram.subject,
          // Koç modunda Pomodoro seçiliyse çalışma süresi formdan alınır
          studyDuration: form.getFieldValue('studyDuration') || 25,
          breakDuration: form.getFieldValue('breakDuration') || 5,
          targetSessions: 1,
          longBreakInterval: form.getFieldValue('longBreakInterval') || 4,
          longBreakDuration: form.getFieldValue('longBreakDuration') || 15
        };
        
        console.log('Coach mode values:', values);
      } else {
        // Normal modda form validation kullan
        values = await form.validateFields();
        console.log('Normal mode values:', values);
      }
      
      // Pomodoro için oturum sayısını SADECE koç modunda toplam hedef süreden hesapla
      if (values.technique === 'Pomodoro') {
        if (coachMode && coachProgram) {
          const study = Number(values.studyDuration) || 25;
          const brk = Number(values.breakDuration) || 0;
          const total = Number(coachProgram.duration);
          const perCycle = Math.max(1, study + brk);
          const sessions = Math.max(1, Math.floor(total / perCycle));
          values.targetSessions = sessions;
        }
        // Normal modda kullanıcı `targetSessions`'ı ayarlayabilir; üzerine yazmayız
      } else {
        // Pomodoro dışı teknikler: koç modunda tek döngü ve mola yok; normal modda kullanıcı ayarını koru
        if (coachMode) {
          values.targetSessions = 1;
          values.breakDuration = 0;
        }
      }

      // Teknik kontrolü
      if (!values.technique) {
        console.error('Technique is required!');
        return;
      }
      
      onConfirm(values as StudySessionConfig);
    } catch (error: any) {
      console.error('Form validation failed:', error);
      console.error('Error fields:', error.errorFields);
      
      // İlk hatayı göster
      if (error.errorFields && error.errorFields.length > 0) {
        const firstError = error.errorFields[0];
        console.error('First error field:', firstError.name, firstError.errors);
      }
    }
  };

  // Subject'leri kategoriye göre gruplama
  const groupedSubjects = SUBJECTS.reduce((acc, subject) => {
    if (!acc[subject.category]) {
      acc[subject.category] = [];
    }
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, typeof SUBJECTS>);

  const currentTechniqueInfo = TECHNIQUE_INFO[selectedTechnique as keyof typeof TECHNIQUE_INFO];

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>
            {coachMode ? 'Koç Programı - Çalışma Tekniği Seçimi' : 'Çalışma Oturumu Ayarları'}
          </span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          İptal
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          icon={<PlayCircleOutlined />}
          onClick={handleConfirm}
          size="large"
        >
          Oturumu Başlat
        </Button>
      ]}
      className="session-setup-modal"
    >
      {/* Koç programı bilgileri */}
      {coachMode && coachProgram && (
        <div style={{ marginBottom: 24 }}>
          <Card size="small" style={{ backgroundColor: '#f0f8ff', border: '1px solid #1890ff' }}>
            <div>
              <Space>
                <BookOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ color: '#1890ff' }}>Koç Programı Detayları</Text>
              </Space>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text><strong>Konu:</strong> {coachProgram.subject?.charAt(0).toUpperCase() + coachProgram.subject?.slice(1)}</Text>
            </div>
            <div style={{ marginTop: 4 }}>
              <Text><strong>Açıklama:</strong> {coachProgram.description}</Text>
            </div>
            <div style={{ marginTop: 4 }}>
              <Text><strong>Hedef Süre:</strong> {coachProgram.duration} dakika</Text>
            </div>
            <div style={{ marginTop: 8, padding: 8, background: '#e6f7ff', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Bu çalışmada konu ve süre koçunuz tarafından belirlenmiştir. Sadece çalışma tekniğinizi seçin.
              </Text>
            </div>
          </Card>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
      >
        {/* Technique Selection */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>
            <BookOutlined /> Çalışma Tekniği
          </Title>
          
          <Form.Item name="technique" rules={[{ required: true }]}>
            <Radio.Group 
              onChange={(e) => handleTechniqueChange(e.target.value)}
              style={{ width: '100%' }}
            >
              <Row gutter={[12, 12]}>
                {Object.entries(TECHNIQUE_INFO).map(([key, info]) => (
                  <Col xs={12} sm={6} key={key}>
                    <Radio.Button 
                      value={key} 
                      style={{ 
                        width: '100%', 
                        textAlign: 'center',
                        height: 'auto',
                        padding: '12px 8px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '20px', marginBottom: 4 }}>
                          {info.icon}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>
                          {key}
                        </div>
                      </div>
                    </Radio.Button>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>

          {/* Technique Info Card */}
          <Card size="small" style={{ backgroundColor: '#f8f9fa' }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Text strong>{currentTechniqueInfo.icon} {selectedTechnique}</Text>
                <Paragraph style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                  {currentTechniqueInfo.description}
                </Paragraph>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <InfoCircleOutlined /> Avantajları:
                </Text>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: '12px' }}>
                  {currentTechniqueInfo.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </Col>
            </Row>
          </Card>
        </div>


        {!coachMode && (
          <>
            <Divider />

            {/* Subject Selection - Sadece normal modda */}
            <Form.Item label="Ders Seçimi" name="subject" rules={[{ required: true }]}>
              <Select 
                placeholder="Çalışacağın dersi seç"
                size="large"
                showSearch
                optionFilterProp="label"
              >
                {Object.entries(groupedSubjects).map(([category, subjects]) => (
                  <Select.OptGroup key={category} label={category}>
                    {subjects.map(subject => (
                      <Option key={subject.value} value={subject.value} label={subject.label}>
                        {subject.label}
                      </Option>
                    ))}
                  </Select.OptGroup>
                ))}
              </Select>
            </Form.Item>

            <Divider />

            {/* Quick Time Selection - Sadece normal modda */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>⚡ Hızlı Seçim:</Text>
              <Space wrap>
                {QUICK_TIMES.map(time => (
                  <Tag.CheckableTag
                    key={time}
                    checked={studyDuration === time}
                    onChange={() => handleQuickTime(time)}
                    style={{ 
                      padding: '4px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px'
                    }}
                  >
                    {time} dakika
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>

            {/* Time Configuration - Sadece normal modda */}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label={
                  <Space>
                    <ClockCircleOutlined />
                    <span>Çalışma Süresi (dakika)</span>
                  </Space>
                } name="studyDuration" rules={[{ required: true, min: 1, max: 180, type: 'number' }]}>
                  <InputNumber
                    min={1}
                    max={180}
                    placeholder="Dakika seçin veya yukarıdan seç"
                    style={{ width: '100%' }}
                    size="large"
                  />
                </Form.Item>
              </Col>

              {selectedTechnique === 'Pomodoro' && (
                <Col xs={24} sm={12}>
                  <Form.Item label="☕ Mola Süresi (dakika)" name="breakDuration">
                    <InputNumber
                      min={1}
                      max={30}
                      style={{ width: '100%' }}
                      size="large"
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </>
        )}

        {/* Oturum sayısı ve mola ayarları - Koç modunda da görüntülenir ama basitleştirilir */}
        {!coachMode && selectedTechnique !== 'Freeform' && (
          <Form.Item label="Hedef Oturum Sayısı" name="targetSessions">
            <InputNumber
              min={1}
              max={10}
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>
        )}

        {selectedTechnique === 'Pomodoro' && (
          <>
            {!coachMode && <Divider />}
            <Row gutter={16}>
              {coachMode && (
                <Col xs={24}>
                  <Form.Item label="Pomodoro Şablonu">
                    <Radio.Group
                      onChange={(e) => {
                        const preset = POMODORO_PRESETS.find(p => p.label === e.target.value);
                        if (preset) {
                          form.setFieldsValue({ studyDuration: preset.study, breakDuration: preset.break });
                        }
                      }}
                      defaultValue={POMODORO_PRESETS[0].label}
                      style={{ width: '100%' }}
                    >
                      <Space wrap>
                        {POMODORO_PRESETS.map(p => (
                          <Radio.Button key={p.label} value={p.label}>
                            {p.label}
                          </Radio.Button>
                        ))}
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              )}
              {!coachMode && (
                <>
                  <Col xs={12}>
                    <Form.Item label="☕ Mola Süresi (dakika)" name="breakDuration">
                      <InputNumber
                        min={1}
                        max={30}
                        style={{ width: '100%' }}
                        placeholder="Dakika"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item label="🔄 Uzun Mola Aralığı" name="longBreakInterval">
                      <InputNumber
                        min={2}
                        max={8}
                        style={{ width: '100%' }}
                        placeholder="Kaç pomodoro sonra"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item label="Mola Süresi" name="longBreakDuration">
                      <InputNumber
                        min={10}
                        max={60}
                        style={{ width: '100%' }}
                        placeholder="Uzun mola dakika"
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default SessionSetup;