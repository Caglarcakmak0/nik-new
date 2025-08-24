import React, { useMemo } from 'react';
import { Card, Form, Rate, Input, Checkbox, Typography, Space, Button } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { submitCoachFeedback, CoachFeedbackCategories, CoachFeedbackSpecificIssues } from '../../../services/api';

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  // Modal kullanımını kaldırdık; embed edilerek gösteriliyor
  coachId: string;
  coachName?: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
  compact?: boolean;
  title?: string;
  submittingExternal?: boolean; // dışarıdan loading göstermek gerekirse
};

const options = [
  { label: 'Fazla baskı', value: 'tooMuchPressure' },
  { label: 'Yetersiz destek', value: 'notEnoughSupport' },
  { label: 'İletişim sorunları', value: 'communicationProblems' },
  { label: 'Program uygun değil', value: 'programNotSuitable' },
] as const;

export const SecretFeedbackForm: React.FC<Props> = ({ coachId, coachName, onSubmitted, onCancel, compact, title, submittingExternal }) => {
  const [form] = Form.useForm();

  const initialValues = useMemo(() => ({
    communication: 3,
    programQuality: 3,
    overallSatisfaction: 3,
    feedback: '',
    issues: [] as CheckboxValueType[],
    other: ''
  }), []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const categories: CoachFeedbackCategories = {
        communication: values.communication,
        programQuality: values.programQuality,
        overallSatisfaction: values.overallSatisfaction,
      };

      const specificIssues: CoachFeedbackSpecificIssues = {};
      (values.issues as CheckboxValueType[]).forEach((key) => {
        specificIssues[key as keyof CoachFeedbackSpecificIssues] = true;
      });
      if (values.other && String(values.other).trim().length > 0) {
        specificIssues.other = String(values.other).trim();
      }

      await submitCoachFeedback({
        coachId,
        categories,
        feedback: values.feedback,
        specificIssues
      });

  onSubmitted?.();
  form.resetFields();
    } catch (err) {
      // validate hataları veya api hataları form içinde gösterilecek
    }
  };

  return (
    <Card size={compact ? 'small' : 'default'} className={`secret-feedback-form ${compact ? 'compact' : ''}`}
      title={title || `Koç Değerlendirmesi${coachName ? ` - ${coachName}` : ''}`}
      extra={onCancel && (
        <Button type="text" size="small" onClick={() => { form.resetFields(); onCancel(); }}>Kapat</Button>
      )}
    >
      <Form layout="vertical" form={form} initialValues={initialValues} disabled={submittingExternal} onFinish={handleSubmit}>
        <Space direction={compact ? 'horizontal' : 'vertical'} style={{ width: '100%' }} wrap>
          <Form.Item label="İletişim" name="communication" rules={[{ required: true }]} style={{ flex: '1 1 160px', minWidth: 140 }}> 
            <Rate count={5} />
          </Form.Item>
          <Form.Item label="Program Kalitesi" name="programQuality" rules={[{ required: true }]} style={{ flex: '1 1 160px', minWidth: 140 }}> 
            <Rate count={5} />
          </Form.Item>
          <Form.Item label="Genel Memnuniyet" name="overallSatisfaction" rules={[{ required: true }]} style={{ flex: '1 1 160px', minWidth: 140 }}> 
            <Rate count={5} />
          </Form.Item>
        </Space>
        <Form.Item label="Özel Konular" name="issues">
          <Checkbox.Group options={options as any} />
        </Form.Item>
        <Form.Item label="Diğer" name="other">
          <Input placeholder="İsteğe bağlı not" maxLength={120} />
        </Form.Item>
        <Form.Item label="Geri Bildirim" name="feedback" rules={[{ required: true, message: 'Lütfen geri bildirim girin' }, { min: 5, message: 'En az 5 karakter' }]}> 
          <TextArea placeholder="Deneyiminizi anlatın..." rows={4} maxLength={1000} showCount />
        </Form.Item>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">Gönderim anonimdir; koçunuz bu metni göremez.</Text>
          <Space>
            {onCancel && <Button onClick={() => { form.resetFields(); onCancel(); }}>İptal</Button>}
            <Button type="primary" htmlType="submit" loading={submittingExternal}>Gönder</Button>
          </Space>
        </Space>
      </Form>
    </Card>
  );
};

export default SecretFeedbackForm;


