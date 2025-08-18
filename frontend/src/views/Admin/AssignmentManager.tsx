import React from 'react';
import { Card, Row, Col, Select, Button, Typography, Space, message } from 'antd';
import { ArrowRightOutlined, TeamOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { getAdminCoaches, getAllUsers, assignCoach, reassignStudent } from '../../services/api';

const { Title, Text } = Typography;

type SimpleOption = { label: string; value: string };

type ApiListResponse<T> = { message: string; data: T; pagination?: any };

const AssignmentManager: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [coaches, setCoaches] = React.useState<SimpleOption[]>([]);
  const [students, setStudents] = React.useState<SimpleOption[]>([]);
  const [coachId, setCoachId] = React.useState<string | undefined>();
  const [toCoachId, setToCoachId] = React.useState<string | undefined>();
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [coachesRes, usersRes] = await Promise.all([
        getAdminCoaches({ page: 1, limit: 100 }) as Promise<ApiListResponse<any[]>>,
        getAllUsers() as Promise<ApiListResponse<{ _id: string; name: string; role: string }[]>>,
      ]);

      setCoaches((coachesRes.data || []).map((c: any) => ({ label: c.name, value: c._id })));
      setStudents((usersRes.data || [])
        .filter((u) => (u.role === 'Öğrenci' || u.role === 'student'))
        .map((u) => ({ label: u.name, value: u._id }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const onAssign = async () => {
    if (!coachId || selectedStudentIds.length === 0) {
      return message.warning('Koç ve en az bir öğrenci seçin');
    }
    try {
      await assignCoach({ coachId, studentIds: selectedStudentIds });
      message.success('Atama yapıldı');
    } catch (e: any) {
      message.error(e?.message || 'Atama hatası');
    }
  };

  const onReassign = async () => {
    if (!selectedStudentIds.length || !coachId || !toCoachId) {
      return message.warning('Öğrenci(ler), kaynak ve hedef koç seçin');
    }
    try {
      // Basitçe ilk seçili öğrenciyi yeniden atıyoruz (UI sade)
      await reassignStudent({ studentId: selectedStudentIds[0], fromCoachId: coachId, toCoachId });
      message.success('Yeniden atama yapıldı');
    } catch (e: any) {
      message.error(e?.message || 'Yeniden atama hatası');
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <TeamOutlined style={{ color: '#1890ff' }} />
        <Title level={4} style={{ margin: 0 }}>Koç-Öğrenci Atama Yöneticisi</Title>
      </Space>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="Toplu Atama" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Koç Seç</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Koç seçin"
                  options={coaches}
                  value={coachId}
                  onChange={setCoachId}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div>
                <Text strong>Öğrenciler</Text>
                <Select
                  mode="multiple"
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Öğrencileri seçin"
                  options={students}
                  value={selectedStudentIds}
                  onChange={setSelectedStudentIds}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={onAssign}>
                Ata
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Yeniden Atama" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Kaynak Koç</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Kaynak koçu seçin"
                  options={coaches}
                  value={coachId}
                  onChange={setCoachId}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div>
                <Text strong>Öğrenci</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Öğrenci seçin"
                  options={students}
                  value={selectedStudentIds}
                  onChange={setSelectedStudentIds}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div>
                <Text strong>Hedef Koç</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Hedef koçu seçin"
                  options={coaches}
                  value={toCoachId}
                  onChange={setToCoachId}
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <Button icon={<UserSwitchOutlined />} onClick={onReassign}>
                Yeniden Ata
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AssignmentManager;


