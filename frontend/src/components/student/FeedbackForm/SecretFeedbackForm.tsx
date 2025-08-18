import React, { useMemo } from 'react';
import { Modal, Form, Rate, Input, Checkbox, Typography } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { submitCoachFeedback, CoachFeedbackCategories, CoachFeedbackSpecificIssues } from '../../../services/api';

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  coachId: string;
  coachName?: string;
  onSubmitted?: () => void;
};

const options = [
  { label: 'Fazla baskı', value: 'tooMuchPressure' },
  { label: 'Yetersiz destek', value: 'notEnoughSupport' },
  { label: 'İletişim sorunları', value: 'communicationProblems' },
  { label: 'Program uygun değil', value: 'programNotSuitable' },
] as const;

export const SecretFeedbackForm: React.FC<Props> = ({ open, onClose, coachId, coachName, onSubmitted }) => {
  const [form] = Form.useForm();

  const initialValues = useMemo(() => ({
    communication: 3,
    programQuality: 3,
    overallSatisfaction: 3,
    feedback: '',
    issues: [] as CheckboxValueType[],
    other: ''
  }), []);

  const handleOk = async () => {
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
      onClose();
      form.resetFields();
    } catch (err) {
      // validate hataları veya api hataları form içinde gösterilecek
    }
  };

  return (
    <Modal
      title={`Koç Değerlendirmesi${coachName ? ` - ${coachName}` : ''}`}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleOk}
      okText="Gönder"
      cancelText="İptal"
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={initialValues}
      >
        <Form.Item label="İletişim" name="communication" rules={[{ required: true }]}> 
          <Rate count={5} />
        </Form.Item>
        <Form.Item label="Program Kalitesi" name="programQuality" rules={[{ required: true }]}> 
          <Rate count={5} />
        </Form.Item>
        <Form.Item label="Genel Memnuniyet" name="overallSatisfaction" rules={[{ required: true }]}> 
          <Rate count={5} />
        </Form.Item>

        <Form.Item label="Özel Konular" name="issues">
          <Checkbox.Group options={options as any} />
        </Form.Item>
        <Form.Item label="Diğer" name="other">
          <Input placeholder="İsteğe bağlı not" maxLength={120} />
        </Form.Item>

        <Form.Item
          label="Geri Bildirim"
          name="feedback"
          rules={[{ required: true, message: 'Lütfen geri bildirim girin' }, { min: 5, message: 'En az 5 karakter' }]}
        >
          <TextArea placeholder="Deneyiminizi anlatın..." rows={4} maxLength={1000} showCount />
        </Form.Item>

        <Text type="secondary">Gönderim anonimdir; koçunuz bu metni göremez.</Text>
      </Form>
    </Modal>
  );
};

export default SecretFeedbackForm;


