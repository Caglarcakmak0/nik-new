import React from 'react';
import { Card, Button, Row, Col } from 'antd';
import { ClockCircleOutlined, AimOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  profileCompleteness?: number;
}

const QuickActions: React.FC<QuickActionsProps> = ({ profileCompleteness = 0 }) => {
  const navigate = useNavigate();

  const actions = [
    {
      key: 'goals',
      title: 'Hedef Ekle',
      icon: <AimOutlined style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }} />,
      onClick: () => navigate('/goals'),
      disabled: false
    },
    {
      key: 'profile',
      title: profileCompleteness < 100 ? 'Profili Tamamla' : 'Profile Git',
      icon: <UserOutlined style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }} />,
      onClick: () => navigate('/profile'),
      disabled: false
    }
  ];

  return (
    <Card title="Hızlı Eylemler">
      <Row gutter={[16, 16]}>
        {actions.map((action) => (
          <Col xs={24} md={12} key={action.key}>
            <Button 
              size="large"
              style={{ width: '100%', height: '80px' }}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <div>
                {action.icon}
                {action.title}
              </div>
            </Button>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default QuickActions;