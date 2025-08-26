import React from 'react';
import { Card, Row, Col, Statistic, Input, Select, Space, Table } from 'antd';
import { UserOutlined, TeamOutlined, SecurityScanOutlined, LineChartOutlined } from '@ant-design/icons';
import { SystemMetrics, User } from '../types';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

interface UsersTabProps {
  systemMetrics: SystemMetrics;
  users: User[];
  usersTotal: number;
  usersPagination: { current: number; pageSize: number };
  loading: boolean;
  roleFilter: '' | 'student' | 'coach' | 'admin';
  userColumns: ColumnsType<User>;
  onSearch(val: string): void;
  onRoleFilterChange(role: '' | 'student' | 'coach' | 'admin'): void;
  onTableChange(pagination: any): void;
  adminCount: number;
  growthPercent: number | null;
}

const UsersTab: React.FC<UsersTabProps> = ({
  systemMetrics,
  users,
  usersTotal,
  usersPagination,
  loading,
  roleFilter,
  userColumns,
  onSearch,
  onRoleFilterChange,
  onTableChange,
  adminCount,
  growthPercent
}) => {
  return (
    <>
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={8} md={6}>
          <Card size="small" className="user-stat students">
            <Statistic
              title="Öğrenciler"
              value={systemMetrics.totalStudents}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small" className="user-stat coaches">
            <Statistic
              title="Koçlar"
              value={systemMetrics.totalCoaches}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={8} md={6}>
          <Card size="small" className="user-stat admins">
            <Statistic title="Adminler" value={adminCount} prefix={<SecurityScanOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small" className="user-stat growth">
            <Statistic title="Aylık Büyüme" value={growthPercent ?? 0} suffix="%" prefix={<LineChartOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>
      <Card
        title="👥 Tüm Kullanıcılar"
        extra={
          <Space>
            <Input.Search
              allowClear
              placeholder="Ada/E-postaya göre ara"
              style={{ width: 260 }}
              onSearch={(val) => onSearch(val.trim())}
            />
            <Select
              value={roleFilter || 'all'}
              style={{ width: 160 }}
              onChange={(val) => onRoleFilterChange(val === 'all' ? '' : (val as any))}
            >
              <Option value="all">Tüm Roller</Option>
              <Option value="student">Öğrenci</Option>
              <Option value="coach">Koç</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="_id"
          pagination={{
            current: usersPagination.current,
            pageSize: usersPagination.pageSize,
            total: usersTotal,
            showSizeChanger: true,
            showTotal: (total) => `Toplam ${total} kullanıcı`
          }}
          loading={loading}
          size="middle"
          onChange={onTableChange}
        />
      </Card>
    </>
  );
};

export default UsersTab;
