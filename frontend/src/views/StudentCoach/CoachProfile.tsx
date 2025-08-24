import React from 'react';
import { Card, Space, Typography, Avatar } from 'antd';
import { toAbsoluteUrl } from '../../services/api';
import './CoachProfile.scss';

type Props = {
  coachName?: string;
  coachEmail?: string;
  coachAvatar?: string | null;
  coachBio?: string;
  assignedAt?: string | Date | null;
  // Feedback butonu kaldırıldı
};

const { Text, Title } = Typography;

export const CoachProfile: React.FC<Props> = ({ coachName, coachEmail, coachAvatar, coachBio, assignedAt }) => {
  return (
    <Card className="coach-profile">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>Koç Profil</Title>
        <Space align="center" size={12}>
          <Avatar size={56} src={toAbsoluteUrl(coachAvatar) || undefined}>
            {(coachName || 'K')[0]}
          </Avatar>
          <div className="coach-info">
            <Text strong style={{ display: 'block' }}>{coachName || 'Koç'}</Text>
            {coachEmail && <Text type="secondary">{coachEmail}</Text>}
          </div>
        </Space>
        {/* Email zaten üst blokta gösteriliyor; tekrar göstermiyoruz */}
        {coachBio && <Text className="coach-bio">{coachBio}</Text>}
        {assignedAt && (
          <Text type="secondary" className="coach-assignment-date">Atama Tarihi: {new Date(assignedAt).toLocaleDateString('tr-TR')}</Text>
        )}
  {/* Feedback butonu kaldırıldı; form sayfada ayrı gösteriliyor */}
      </Space>
    </Card>
  );
};

export default CoachProfile;


