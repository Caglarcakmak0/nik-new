import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Descriptions,
  Divider,
  message,
  Space,
  Tooltip,
  AutoComplete
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  BookOutlined,
  AimOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../services/api';

const { Option } = Select;

// YKS alan türleri tooltipleri
const fieldTypeTooltips = {
  sayisal: 'Matematik, Fizik, Kimya, Biyoloji ağırlıklı alan',
  sozel: 'Türkçe, Tarih, Coğrafya, Felsefe ağırlıklı alan',
  esit_agirlik: 'Sayısal ve sözel derslerin eşit ağırlıkta olduğu alan',
  dil: 'Yabancı dil ağırlıklı alan'
};

// Okul türleri
const schoolTypes = [
  { value: 'anadolu', label: 'Anadolu Lisesi' },
  { value: 'fen', label: 'Fen Lisesi' },
  { value: 'sosyal_bilimler', label: 'Sosyal Bilimler Lisesi' },
  { value: 'imam_hatip', label: 'İmam Hatip Lisesi' },
  { value: 'meslek', label: 'Meslek Lisesi' },
  { value: 'other', label: 'Diğer' }
];

// Sınıf seçenekleri
const gradeOptions = [
  { value: '9', label: '9. Sınıf' },
  { value: '10', label: '10. Sınıf' },
  { value: '11', label: '11. Sınıf' },
  { value: '12', label: '12. Sınıf' },
  { value: 'Mezun', label: 'Mezun' }
];

// YKS alan türleri
const fieldTypes = [
  { value: 'sayisal', label: 'Sayısal (SAY)' },
  { value: 'sozel', label: 'Sözel (SÖZ)' },
  { value: 'esit_agirlik', label: 'Eşit Ağırlık (EA)' },
  { value: 'dil', label: 'Dil (DİL)' }
];

// Türkiye şehirleri (örnek)
const turkishCities = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
  'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
  'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
  'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
  'Gümüşhane', 'Hakkâri', 'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir',
  'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya',
  'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop',
  'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale',
  'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis',
  'Osmaniye', 'Düzce'
];

interface EducationInfo {
  currentSchool?: string;
  schoolType?: string;
  grade?: string;
  city?: string;
  targetYear?: number;
  targetFieldType?: string;
}

const EducationInfoPage: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [educationInfo, setEducationInfo] = useState<EducationInfo>({});

  // Hedef yıl seçenekleri (mevcut yıl + 6 yıl)
  const currentYear = new Date().getFullYear();
  const targetYears = Array.from({ length: 7 }, (_, i) => currentYear + i);

  // Şehir otomatik tamamlama seçenekleri
  const [cityOptions, setCityOptions] = useState<{ value: string }[]>([]);

  const handleCitySearch = (searchText: string) => {
    const filteredCities = turkishCities
      .filter(city => city.toLowerCase().includes(searchText.toLowerCase()))
      .map(city => ({ value: city }));
    setCityOptions(filteredCities);
  };

  // Sayfa yüklendiğinde eğitim bilgilerini al
  useEffect(() => {
    fetchEducationInfo();
  }, []);

  const fetchEducationInfo = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/users/profile');
      setEducationInfo(response.data || {});
      form.setFieldsValue(response.data || {});
    } catch (error) {
      console.error('Eğitim bilgileri alınamadı:', error);
      message.error('Eğitim bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // user ID'yi AuthContext'ten al
      if (!user?._id) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }

      await apiRequest(`/users/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify(values)
      });

      setEducationInfo(values);
      setIsEditing(false);
      message.success('Eğitim bilgileri başarıyla güncellendi!');
    } catch (error: any) {
      console.error('Kaydetme hatası:', error);
      message.error(error.message || 'Kaydetme sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.setFieldsValue(educationInfo);
    setIsEditing(false);
  };

  const getSchoolTypeLabel = (value?: string) => {
    const schoolType = schoolTypes.find(type => type.value === value);
    return schoolType ? schoolType.label : value || '-';
  };

  const getGradeLabel = (value?: string) => {
    const grade = gradeOptions.find(opt => opt.value === value);
    return grade ? grade.label : value || '-';
  };

  const getFieldTypeLabel = (value?: string) => {
    const fieldType = fieldTypes.find(type => type.value === value);
    return fieldType ? fieldType.label : value || '-';
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOutlined />
              YKS Eğitim Bilgileri
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              Mevcut eğitim durumun ve YKS hedeflerin hakkında bilgi ver
            </p>
          </div>
          {!isEditing && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
            >
              Düzenle
            </Button>
          )}
        </div>

        {isEditing ? (
          <Form
            form={form}
            layout="vertical"
            initialValues={educationInfo}
            onFinish={handleSave}
          >
            {/* Mevcut Eğitim Durumu */}
            <Card size="small" title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOutlined />
                Mevcut Eğitim Durumu
              </span>
            } style={{ marginBottom: '16px' }}>
              <Form.Item
                label="Okul Adı"
                name="currentSchool"
                rules={[
                  { required: true, message: 'Okul adı gereklidir' },
                  { max: 100, message: 'Okul adı 100 karakterden fazla olamaz' }
                ]}
              >
                <Input placeholder="Örnek: Ankara Atatürk Anadolu Lisesi" />
              </Form.Item>

              <Form.Item
                label="Okul Türü"
                name="schoolType"
                rules={[{ required: true, message: 'Okul türü seçmeniz gereklidir' }]}
              >
                <Select placeholder="Okul türünüzü seçin">
                  {schoolTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Sınıf"
                name="grade"
                rules={[{ required: true, message: 'Sınıf seçmeniz gereklidir' }]}
              >
                <Select placeholder="Hangi sınıftasın?">
                  {gradeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Şehir"
                name="city"
                rules={[
                  { required: true, message: 'Şehir gereklidir' },
                  { max: 50, message: 'Şehir adı 50 karakterden fazla olamaz' }
                ]}
              >
                <AutoComplete
                  options={cityOptions}
                  onSearch={handleCitySearch}
                  placeholder="Şehrinizi seçin veya yazın"
                  filterOption={false}
                />
              </Form.Item>
            </Card>

            {/* YKS Hedef Bilgileri */}
            <Card size="small" title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AimOutlined />
                YKS Hedef Bilgileri
              </span>
            } style={{ marginBottom: '24px' }}>
              <Form.Item
                label="Hedef Yıl"
                name="targetYear"
                rules={[
                  { required: true, message: 'Hedef yıl seçmeniz gereklidir' },
                  {
                    validator: (_, value) => {
                      if (value && value < currentYear) {
                        return Promise.reject('Hedef yıl mevcut yıl veya gelecek bir yıl olmalıdır');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Select placeholder="Hangi yıl YKS'ye gireceksin?">
                  {targetYears.map(year => (
                    <Option key={year} value={year}>
                      {year}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    Hedef Alan Türü{' '}
                    <Tooltip title="YKS'de hangi alan türünde sınava girmeyi planlıyorsun?">
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </span>
                }
                name="targetFieldType"
                rules={[{ required: true, message: 'Hedef alan türü seçmeniz gereklidir' }]}
              >
                <Select placeholder="Hedef alan türünü seçin">
                  {fieldTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      <Tooltip title={fieldTypeTooltips[type.value as keyof typeof fieldTypeTooltips]}>
                        {type.label}
                      </Tooltip>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={loading}
                htmlType="submit"
              >
                Kaydet
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancel}
                disabled={loading}
              >
                İptal
              </Button>
            </Space>
          </Form>
        ) : (
          <div>
            {/* Görüntüleme Modu */}
            <Card size="small" title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOutlined />
                Mevcut Eğitim Durumu
              </span>
            } style={{ marginBottom: '16px' }}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Okul Adı">
                  {educationInfo.currentSchool || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Okul Türü">
                  {getSchoolTypeLabel(educationInfo.schoolType)}
                </Descriptions.Item>
                <Descriptions.Item label="Sınıf">
                  {getGradeLabel(educationInfo.grade)}
                </Descriptions.Item>
                <Descriptions.Item label="Şehir">
                  {educationInfo.city || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AimOutlined />
                YKS Hedef Bilgileri
              </span>
            }>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Hedef Yıl">
                  {educationInfo.targetYear || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Hedef Alan Türü">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getFieldTypeLabel(educationInfo.targetFieldType)}
                    {educationInfo.targetFieldType && (
                      <Tooltip title={fieldTypeTooltips[educationInfo.targetFieldType as keyof typeof fieldTypeTooltips]}>
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    )}
                  </div>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Eğer hiç bilgi yoksa uyarı göster */}
            {Object.keys(educationInfo).length === 0 && (
              <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                backgroundColor: '#f6ffed', 
                border: '1px solid #b7eb8f',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <InfoCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                YKS yolculuğuna başlamak için eğitim bilgilerini tamamla!
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EducationInfoPage;