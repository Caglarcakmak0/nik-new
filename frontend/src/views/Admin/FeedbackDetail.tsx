import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Space, Typography, Button, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminFeedbackDetail, markAdminFeedbackRead } from '../../services/api';

const { Title, Paragraph, Text } = Typography;

export const FeedbackDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getAdminFeedbackDetail(id);
      setDetail(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleMarkRead = async () => {
    if (!id) return;
    await markAdminFeedbackRead(id);
    message.success('Feedback okundu olarak işaretlendi');
    load();
  };

  if (!detail) return <Card loading={loading} />;

  const issues = detail.specificIssues || {};

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>Feedback Detayı</Title>
        <Space>
          {detail.status === 'new' ? (
            <Button type="primary" onClick={handleMarkRead}>Okundu olarak işaretle</Button>
          ) : (
            <Tag color="green">Okundu</Tag>
          )}
          <Button onClick={() => navigate('/admin/statistics')}>Geri</Button>
        </Space>
      </Space>

      <Card>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Tarih">{new Date(detail.createdAt).toLocaleString('tr-TR')}</Descriptions.Item>
          <Descriptions.Item label="Öğrenci">{detail.student?.name}</Descriptions.Item>
          <Descriptions.Item label="Koç">{detail.coach?.name}</Descriptions.Item>
          <Descriptions.Item label="Puanlar">
            <Space wrap>
              <Tag>İletişim: {detail.categories?.communication}/5</Tag>
              <Tag>Program Kalitesi: {detail.categories?.programQuality}/5</Tag>
              <Tag>Genel Memnuniyet: {detail.categories?.overallSatisfaction}/5</Tag>
              <Tag color="blue">Ortalama: {detail.overallRating}</Tag>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Özel Konular">
            <Space wrap>
              {issues.tooMuchPressure && <Tag>Fazla baskı</Tag>}
              {issues.notEnoughSupport && <Tag>Yetersiz destek</Tag>}
              {issues.communicationProblems && <Tag>İletişim sorunları</Tag>}
              {issues.programNotSuitable && <Tag>Program uygun değil</Tag>}
              {issues.other && <Tag color="purple">Diğer: {issues.other}</Tag>}
              {!issues.tooMuchPressure && !issues.notEnoughSupport && !issues.communicationProblems && !issues.programNotSuitable && !issues.other && <Text type="secondary">—</Text>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Geri Bildirim">
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{detail.feedback}</Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
};

export default FeedbackDetail;


