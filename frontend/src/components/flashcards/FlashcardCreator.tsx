import React from 'react';
import { Button, Divider, Form, Input, Select, Slider, Space, Tooltip } from 'antd';
import { Flashcard, createFlashcard, updateFlashcard } from '../../services/api';
import { message } from 'antd';

export interface FlashcardCreatorProps {
  topics: string[];
  editing?: Flashcard | null;
  loading?: boolean;
  onSaved: () => void;
  onCancelEdit: () => void;
  setFilterTopic: (t: string)=>void;
}

interface FormState { topic: string; question: string; answer: string; tags: string[]; difficulty: number; }
const empty: FormState = { topic: '', question: '', answer: '', tags: [], difficulty: 3 };

const FlashcardCreator: React.FC<FlashcardCreatorProps> = ({ topics, editing, onSaved, onCancelEdit, setFilterTopic }) => {
  const [form] = Form.useForm<FormState>();

  React.useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        topic: editing.topic,
        question: editing.question,
        answer: editing.answer,
        tags: editing.tags || [],
        difficulty: editing.stats?.difficulty || 3
      });
    } else {
      form.resetFields();
      form.setFieldsValue(empty);
    }
  }, [editing, form]);

  const submit = async (values: FormState) => {
    if (!values.topic || !values.question || !values.answer) return;
    try {
      if (editing) {
        await updateFlashcard(editing._id, { topic: values.topic.trim(), question: values.question.trim(), answer: values.answer.trim(), tags: values.tags, difficulty: values.difficulty });
        message.success('Kart güncellendi');
      } else {
        await createFlashcard({ topic: values.topic.trim(), question: values.question.trim(), answer: values.answer.trim(), tags: values.tags, difficulty: values.difficulty });
        message.success('Kart oluşturuldu');
      }
      onSaved();
      if (!editing) form.setFieldsValue(empty);
    } catch (e:any) {
      message.error(e.message);
    }
  };

  return (
    <Form form={form} layout="vertical" initialValues={empty} onFinish={submit} className="fc-creator">
      <Form.Item name="topic" label="Konu" rules={[{ required: true, message:'Konu gerekli'}]}>
        <Select
          showSearch
          placeholder="Örn: Trigonometri"
          optionFilterProp="label"
          dropdownRender={menu => (
            <>
              {menu}
              <Divider style={{ margin:'4px 0'}} />
              <div style={{ padding:4 }}>
                <Input placeholder="Yeni konu yaz ve Enter" onPressEnter={e => {
                  const v=(e.target as HTMLInputElement).value.trim();
                  if (v) { setFilterTopic(v); form.setFieldValue('topic', v); (e.target as HTMLInputElement).value=''; }
                }} />
              </div>
            </>
          )}
          options={topics.map(t => ({ value:t, label:t }))}
          allowClear
        />
      </Form.Item>
      <Form.Item name="question" label="Soru" rules={[{ required:true, message:'Soru gerekli'}]}>
        <Input.TextArea rows={2} autoSize={{ minRows:2, maxRows:4 }} />
      </Form.Item>
      <Form.Item name="answer" label={<Space>Cevap<Tooltip title="Markdown desteklenir">ℹ️</Tooltip></Space>} rules={[{ required:true, message:'Cevap gerekli'}]}>
        <Input.TextArea rows={5} autoSize={{ minRows:5, maxRows:10 }} />
      </Form.Item>
      <Form.Item name="tags" label="Etiketler">
        <Select mode="tags" placeholder="Etiket ekle" open={false} tokenSeparators={[',']} />
      </Form.Item>
      <Form.Item name="difficulty" label="Zorluk">
        <Slider min={1} max={5} marks={{1:'1',2:'2',3:'3',4:'4',5:'5'}} />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">{editing ? 'Güncelle':'Kaydet'}</Button>
          {editing && <Button onClick={onCancelEdit}>İptal</Button>}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default FlashcardCreator;
