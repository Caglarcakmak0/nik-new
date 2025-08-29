import React, { useMemo, useState } from 'react';
import { Form, Rate, Input, Typography, Button, Tooltip } from 'antd';
import { submitCoachFeedback, CoachFeedbackCategories, CoachFeedbackSpecificIssues } from '../../../services/api';
import './SecretFeedbackForm.scss';

const { TextArea } = Input;
const { Title } = Typography;

type CheckboxValueType = string | number;

type Props = {
  coachId: string;
  coachName?: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
  compact?: boolean;
  title?: string;
  submittingExternal?: boolean;
};

const ISSUE_OPTIONS = [
  { label: 'Fazla baskı', value: 'tooMuchPressure' },
  { label: 'Yetersiz destek', value: 'notEnoughSupport' },
  { label: 'İletişim sorunları', value: 'communicationProblems' },
  { label: 'Program uygun değil', value: 'programNotSuitable' }
] as const;

export const SecretFeedbackForm: React.FC<Props> = ({ coachId, coachName, onSubmitted, onCancel, compact, title, submittingExternal }) => {
  const [form] = Form.useForm();
  const [issues, setIssues] = useState<CheckboxValueType[]>([]);
  const [feedbackLen, setFeedbackLen] = useState(0);

  const initialValues = useMemo(() => ({
    communication: 3,
    programQuality: 3,
    overallSatisfaction: 3,
    feedback: '',
    other: ''
  }), []);

  const toggleIssue = (val: CheckboxValueType) => {
    setIssues(prev => {
      const exists = prev.includes(val);
      const next = exists ? prev.filter(v => v !== val) : [...prev, val];
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const categories: CoachFeedbackCategories = {
        communication: values.communication,
        programQuality: values.programQuality,
        overallSatisfaction: values.overallSatisfaction
      };
      const specificIssues: CoachFeedbackSpecificIssues = {};
      issues.forEach((key) => {
        (specificIssues as any)[key as keyof CoachFeedbackSpecificIssues] = true;
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
      setIssues([]);
      setFeedbackLen(0);
    } catch (_) {
      /* noop */
    }
  };

  return (
    <div className={`secret-feedback-form sff-root ${compact ? 'compact' : ''}`}> 
      <div className="sff-header">
        <div className="sff-head-text">
          <Title level={4} className="sff-title">{title || 'Koç Değerlendirmesi'}{coachName && <span className="sff-title-accent"> • {coachName}</span>}</Title>
          <p className="sff-sub">Deneyimini değerlendir, gelişime yön ver. Anonim ve gizli.</p>
        </div>
        {onCancel && (
          <Button type="text" size="small" onClick={() => { form.resetFields(); setIssues([]); onCancel(); }} className="sff-close-btn">Kapat</Button>
        )}
      </div>
      <Form form={form} layout="vertical" initialValues={initialValues} disabled={submittingExternal} onFinish={handleSubmit} className="sff-form">
        <div className="sff-section sff-ratings">
          <div className="sff-section-head">
            <h5>Temel Alanlar</h5>
            <span className="sff-help">1 (düşük) – 5 (yüksek)</span>
          </div>
          <div className="sff-rating-grid">
            <Form.Item name="communication" label={<span>İletişim</span>} rules={[{ required: true }]} className="sff-rating-item">
              <Rate count={5} />
            </Form.Item>
            <Form.Item name="programQuality" label={<span>Program Kalitesi</span>} rules={[{ required: true }]} className="sff-rating-item">
              <Rate count={5} />
            </Form.Item>
            <Form.Item name="overallSatisfaction" label={<span>Genel Memnuniyet</span>} rules={[{ required: true }]} className="sff-rating-item">
              <Rate count={5} />
            </Form.Item>
          </div>
        </div>

        <div className="sff-section sff-issues">
          <div className="sff-section-head">
            <h5>Özel Konular</h5>
            <span className="sff-help">İlgili olanları seç</span>
          </div>
          <div className="sff-issue-pills">
            {ISSUE_OPTIONS.map(opt => {
              const active = issues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`sff-pill ${active ? 'active' : ''}`}
                  onClick={() => toggleIssue(opt.value)}
                  aria-pressed={active}
                >{opt.label}</button>
              );
            })}
          </div>
          <Form.Item name="other" label="Diğer" className="sff-other-item">
            <Input placeholder="Eklemek istediğin başka bir konu" maxLength={120} />
          </Form.Item>
        </div>

        <div className="sff-section sff-feedback">
          <div className="sff-section-head">
            <h5>Geri Bildirim Metni</h5>
            <span className="sff-help">Minimum 5 karakter</span>
          </div>
          <Form.Item name="feedback" rules={[{ required: true, message: 'Lütfen geri bildirim girin' }, { min: 5, message: 'En az 5 karakter' }]} className="sff-feedback-item">
            <div className="sff-textarea-wrapper">
              <TextArea
                placeholder="Deneyimini detaylandır..."
                rows={5}
                maxLength={1000}
                onChange={(e) => setFeedbackLen(e.target.value.length)}
              />
              <div className="sff-count">{feedbackLen}/1000</div>
            </div>
          </Form.Item>
          <Tooltip title="Metin anonim; koç bu alanı görmez" placement="right">
            <div className="sff-privacy-note">Gönderim anonimdir; koçunuz bu metni göremez.</div>
          </Tooltip>
        </div>

        <div className="sff-footer">
          <div className="sff-footer-left">
            <span className="sff-footer-hint">Geri bildirimin, sistemde koçluk kalitesini iyileştirmemize yardım eder.</span>
          </div>
          <div className="sff-actions">
            {onCancel && <Button onClick={() => { form.resetFields(); setIssues([]); onCancel(); }} className="sff-btn-cancel">İptal</Button>}
            <Button type="primary" htmlType="submit" loading={submittingExternal} className="sff-btn-submit">Gönder</Button>
          </div>
        </div>
      </Form>
      {/* Hidden field sync for issues */}
      <input type="hidden" value={issues.join(',')} aria-hidden="true" />
    </div>
  );
};

export default SecretFeedbackForm;


