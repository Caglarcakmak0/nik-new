import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Button, 
  Space,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Tag
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface CreatePlanModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (planData: any) => void;
  selectedDate: Dayjs;
  loading?: boolean;
}

const subjects = [
  { value: 'matematik', label: '📐 Matematik', type: 'TYT' },
          { value: 'turkce', label: 'Türkçe', type: 'TYT' },
  { value: 'kimya', label: '🧪 Kimya', type: 'TYT' },
  { value: 'fizik', label: '🔬 Fizik', type: 'TYT' },
  { value: 'biyoloji', label: '🌱 Biyoloji', type: 'TYT' },
          { value: 'tarih', label: 'Tarih', type: 'TYT' },
  { value: 'cografya', label: '🌍 Coğrafya', type: 'TYT' },
  { value: 'felsefe', label: '🤔 Felsefe', type: 'TYT' },
  { value: 'geometri', label: '📐 Geometri', type: 'TYT' },
  { value: 'matematik_ayt', label: '📐 Matematik (AYT)', type: 'AYT' },
  { value: 'fizik_ayt', label: '🔬 Fizik (AYT)', type: 'AYT' },
  { value: 'kimya_ayt', label: '🧪 Kimya (AYT)', type: 'AYT' },
  { value: 'biyoloji_ayt', label: '🌱 Biyoloji (AYT)', type: 'AYT' },
          { value: 'edebiyat', label: 'Edebiyat', type: 'AYT' },
  { value: 'ingilizce', label: '🇬🇧 İngilizce', type: 'YDT' },
];

const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  selectedDate,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const handleSubmit = async (values: any) => {
    try {
      const planData = {
        title: values.title || `${selectedDate.format('DD MMMM YYYY')} Çalışma Programı`,
        subjects: values.subjects.map((subject: any, index: number) => ({
          ...subject,
          priority: index + 1,
          completedQuestions: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          blankAnswers: 0,
          studyTime: 0,
          status: 'not_started',
          sessionIds: []
        })),
        motivationNote: values.motivationNote,
        dailyGoal: values.dailyGoal,
        status: 'active'
      };

      onSubmit(planData);
    } catch (error) {
      console.error('Plan creation error:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedSubjects([]);
    onCancel();
  };

  return (
    <Modal
      title={`${selectedDate.format('DD MMMM YYYY')} için Plan Oluştur`}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          subjects: [{}]
        }}
      >
        {/* Plan Başlığı */}
        <Form.Item
          label="Plan Başlığı"
          name="title"
        >
          <Input 
            placeholder={`${selectedDate.format('DD MMMM YYYY')} Çalışma Programı`}
          />
        </Form.Item>

        {/* Dersler */}
        <div>
          <Title level={5}>Dersler ve Hedefler</Title>
          <Form.List name="subjects">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card 
                    key={key} 
                    size="small" 
                    style={{ marginBottom: '16px' }}
                    extra={
                      fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          size="small"
                        >
                          Kaldır
                        </Button>
                      )
                    }
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'subject']}
                          label="Ders"
                          rules={[{ required: true, message: 'Ders seçin' }]}
                        >
                          <Select 
                            placeholder="Ders seçin"
                            showSearch
                            optionFilterProp="children"
                          >
                            {subjects.map(subject => (
                              <Option key={subject.value} value={subject.value}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{subject.label}</span>
                                  <Tag size="small" color={
                                    subject.type === 'TYT' ? 'blue' : 
                                    subject.type === 'AYT' ? 'green' : 'orange'
                                  }>
                                    {subject.type}
                                  </Tag>
                                </div>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col xs={12} md={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'targetQuestions']}
                          label="Hedef Soru"
                          rules={[
                            { required: true, message: 'Gerekli' },
                            { type: 'number', min: 1, max: 500, message: '1-500 arası' }
                          ]}
                        >
                          <InputNumber 
                            placeholder="0" 
                            min={1}
                            max={500}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={12} md={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'targetTime']}
                          label="Hedef Süre (dk)"
                        >
                          <InputNumber 
                            placeholder="0" 
                            min={5}
                            max={600}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'topics']}
                          label="Konular"
                        >
                          <Select
                            mode="tags"
                            placeholder="Konu ekleyin"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Ders Ekle
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>

        <Divider />

        {/* Motivasyon ve Hedef */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Günlük Hedef"
              name="dailyGoal"
            >
              <Input placeholder="Bugünkü ana hedefim..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Motivasyon Notu"
              name="motivationNote"
            >
              <TextArea 
                rows={2}
                placeholder="Kendimi motive etmek için..."
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Form Actions */}
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              İptal
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Plan Oluştur
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreatePlanModal;