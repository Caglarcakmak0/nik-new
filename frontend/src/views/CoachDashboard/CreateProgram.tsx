import React, { useEffect, useRef, useState } from 'react';
import { Card, Form, DatePicker, Select, Button, InputNumber, Input, Space, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CreateProgramTour from '../../components/tour/CoachTour/CreateProgramTour';
import './CreateProgram.scss';

type SubjectForm = {
  subject: string;
  description: string;
  duration: number;
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

  useEffect(() => {
    const studentId = search.get('studentId');
    form.setFieldsValue({
      studentId: studentId || undefined,
      date: dayjs(),
      subjects: [{ subject: '', description: '', duration: 60 }]
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
        // Seçili öğrenci listede yoksa fallback olarak ekle
        if (studentId && !items.find((it: any) => it.value === studentId)) {
          items.unshift({ value: studentId, label: studentId });
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
        subjects: values.subjects,
        title: `Koç Programı - ${values.date.format('DD/MM/YYYY')}`,
      };
      await apiRequest('/coach/programs', { method: 'POST', body: JSON.stringify(payload) });
      message.success(`Program oluşturuldu! Toplam süre: ${totalHours} saat ${totalMinutes} dakika`);
      navigate('/coach/programs');
    } catch (e: any) {
      message.error(e.message || 'Program oluşturulamadı');
    }
  };

  return (
    <div className="create-program">
      <Form form={form} layout="vertical" onFinish={submit}>
        {/* Öğrenci ve Tarih Bilgileri Kartı */}
        <Card title="Program Bilgileri" style={{ marginBottom: 16 }}>
          <Form.Item name="studentId" label="Öğrenci" rules={[{ required: true, message: 'Öğrenci seçiniz' }]}> 
            <div ref={studentSelectRef as any}>
            <Select
              showSearch
              placeholder="Öğrenci seçiniz"
              loading={loading}
              options={studentOptions}
              filterOption={(input, option) => 
                option?.label ? (option.label as string).toLowerCase().includes(input.toLowerCase()) : false
              }
              disabled={isStudentLocked}
            />
            </div>
          </Form.Item>

          <Form.Item name="date" label="Program Tarihi" rules={[{ required: true, message: 'Tarih seçiniz' }]}>
            <div ref={datePickerRef as any}>
            <DatePicker 
              style={{ width: '100%' }} 
              format="DD/MM/YYYY" 
              placeholder="Program tarihini seçin"
              size="large"
            />
            </div>
          </Form.Item>
        </Card>

        {/* Dersler Kartı */}
        <Card title="Program Dersleri" style={{ marginBottom: 16 }}>
          <Form.List name="subjects">
            {(fields, { add, remove }) => (
              <>
                <div ref={subjectsListRef as any}>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 12 }} title={`Ders ${name + 1}`}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Form.Item {...restField} name={[name, 'subject']} label="Ders" rules={[{ required: true, message: 'Ders seçiniz' }]}>
                        <Select placeholder="Ders seçin">
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
                      <Form.Item {...restField} name={[name, 'duration']} label="Süre (dk)" rules={[{ required: true, message: 'Süre giriniz' }]}>
                        <InputNumber min={15} max={480} step={15} style={{ width: 160 }} />
                      </Form.Item>
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


