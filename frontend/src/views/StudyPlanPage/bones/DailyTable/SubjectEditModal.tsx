import React from 'react';
import { 
  Modal, 
  Form, 
  InputNumber, 
  Select, 
  Button, 
  Space, 
  Row, 
  Col 
} from 'antd';

const { Option } = Select;


interface Subject {
  subject: string;
  targetQuestions: number;
  targetTime?: number;
  topics: string[];
  description?: string;
  sessionIds?: string[];
  priority: number;
  completedQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  studyTime: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
}

interface SubjectEditModalProps {
  visible: boolean;
  subject: Subject;
  onSave: (updatedSubject: Subject) => void;
  onCancel: () => void;
}

const SubjectEditModal: React.FC<SubjectEditModalProps> = ({
  visible,
  subject,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    onSave({
      ...subject,
      ...values,
      topics: values.topics || []
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Ders Bilgilerini Düzenle"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={subject}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Hedef Soru Sayısı"
              name="targetQuestions"
              rules={[
                { required: true, message: 'Gerekli alan' },
                { type: 'number', min: 1, max: 500, message: '1-500 arası olmalı' }
              ]}
            >
              <InputNumber 
                min={1} 
                max={500} 
                style={{ width: '100%' }} 
                placeholder="Hedef soru sayısı"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Hedef Süre (dakika)"
              name="targetTime"
            >
              <InputNumber 
                min={5} 
                max={600} 
                style={{ width: '100%' }} 
                placeholder="Hedef çalışma süresi"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Öncelik"
              name="priority"
              rules={[{ required: true, message: 'Öncelik seçin' }]}
            >
              <Select placeholder="Öncelik seviyesi">
                {[1,2,3,4,5,6,7,8,9,10].map(p => (
                  <Option key={p} value={p}>
                    {p} - {p <= 3 ? 'Yüksek' : p <= 6 ? 'Orta' : 'Düşük'}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Durum"
              name="status"
              rules={[{ required: true, message: 'Durum seçin' }]}
            >
              <Select placeholder="Ders durumu">
                <Option value="not_started">Başlanmadı</Option>
                <Option value="in_progress">Devam Ediyor</Option>
                <Option value="completed">Tamamlandı</Option>
                <Option value="skipped">Atlandı</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Konular"
          name="topics"
        >
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Çalışılacak konuları ekleyin"
            tokenSeparators={[',', ';']}
          />
        </Form.Item>

        {/* Koç tarafından belirlenen açıklama öğrenci tarafından değiştirilemez */}

        <Row gutter={16}>
          <Col xs={8}>
            <Form.Item
              label="Doğru Sayısı"
              name="correctAnswers"
            >
              <InputNumber 
                min={0} 
                style={{ width: '100%' }}
                placeholder="Doğru"
              />
            </Form.Item>
          </Col>

          <Col xs={8}>
            <Form.Item
              label="Yanlış Sayısı"
              name="wrongAnswers"
            >
              <InputNumber 
                min={0} 
                style={{ width: '100%' }}
                placeholder="Yanlış"
              />
            </Form.Item>
          </Col>

          <Col xs={8}>
            <Form.Item
              label="Boş Sayısı"
              name="blankAnswers"
            >
              <InputNumber 
                min={0} 
                style={{ width: '100%' }}
                placeholder="Boş"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              İptal
            </Button>
            <Button type="primary" htmlType="submit">
              Kaydet
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SubjectEditModal;