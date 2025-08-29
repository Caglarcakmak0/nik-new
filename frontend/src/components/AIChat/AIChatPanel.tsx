import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, List, Typography, Space, Tag, Avatar } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

interface ChatApiResponse {
  response: string;
  sources?: string[];
  model?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface AIChatPanelProps {
  apiBase?: string; // default /api/ai
  token?: string; // optional override
  height?: number;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({ apiBase = '/api/ai', token, height = 420 }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Merhaba! Ben YKS çalışma asistanın. Bana çalışma performansın, YKS ile ilgili soruların veya hangi konulara odaklanman gerektiği hakkında her şeyi sorabilirsin.'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    const current = input.trim();
    setInput('');
    setLoading(true);
    try {
  const res = await axios.post<ChatApiResponse>(`${apiBase}/chat`, { message: current }, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      const aiMsg: ChatMessage = {
        role: 'assistant',
    content: res.data?.response || 'Boş yanıt',
    sources: res.data?.sources
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e:any) {
      const errMsg: ChatMessage = { role: 'assistant', content: 'Hata: ' + (e.response?.data?.message || e.message) };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card title={<Space><RobotOutlined /> <span>AI Asistan</span></Space>} bodyStyle={{ padding: 0 }}>
      <div ref={listRef} style={{ maxHeight: height, overflowY: 'auto', padding: '12px' }}>
        <List
          dataSource={messages}
          renderItem={(m) => (
            <List.Item style={{ border: 'none', padding: '8px 0' }}>
              <Space align="start" style={{ width: '100%' }}>
                <Avatar icon={m.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />} />
                <div style={{ flex: 1 }}>
                  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 4 }}>{m.content}</Typography.Paragraph>
                  {m.sources && m.sources.length > 0 && (
                    <Space wrap>
                      {m.sources.map(s => <Tag key={s}>{s}</Tag>)}
                    </Space>
                  )}
                </div>
              </Space>
            </List.Item>
          )}
        />
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', padding: 12 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea
            value={input}
            onChange={e => setInput(e.target.value)}
            autoSize={{ minRows: 1, maxRows: 4 }}
            onKeyDown={handleKey}
            placeholder="Sorunu yaz..."
            disabled={loading}
          />
          <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={send}>Gönder</Button>
        </Space.Compact>
      </div>
    </Card>
  );
};

export default AIChatPanel;
