import React from 'react';
import { Avatar, Space, Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { toAbsoluteUrl } from '../../../services/api';

const { Text } = Typography;

export type CoachStudentInfo = {
  _id?: string;
  fullName: string;
  email: string;
  grade?: string;
  avatar?: string | null;
};

type Props = {
  student: CoachStudentInfo;
  showGradeTag?: boolean;
  avatarSize?: number | 'large' | 'small' | 'default';
};

const StudentCard: React.FC<Props> = ({ student, showGradeTag = true, avatarSize = 'large' }) => {
  return (
    <Space>
      <Avatar src={toAbsoluteUrl(student.avatar || undefined)} icon={<UserOutlined />} size={avatarSize} />
      <div>
        <div style={{ fontWeight: 600 }}>{student.fullName}</div>
        <Text type="secondary" style={{ display: 'block' }}>{student.email}</Text>
        {showGradeTag && student.grade && (
          <Tag color="blue">{student.grade}</Tag>
        )}
      </div>
    </Space>
  );
};

export default StudentCard;


