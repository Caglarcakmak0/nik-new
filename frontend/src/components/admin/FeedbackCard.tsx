import React from 'react';
import { Tag } from 'antd';

export type FeedbackStatusTagProps = {
  status: 'new' | 'read';
};

const FeedbackStatusTag: React.FC<FeedbackStatusTagProps> = ({ status }) => {
  return status === 'new' ? <Tag color="gold">Yeni</Tag> : <Tag color="green">Okundu</Tag>;
};

export default FeedbackStatusTag;


