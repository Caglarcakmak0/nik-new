import React from 'react';
import { Tooltip, Button, Divider, Typography, Popconfirm } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Flashcard } from '../../services/api';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';


export interface FlashcardListItemProps {
  card: Flashcard;
  onEdit: (c: Flashcard)=>void;
  onDelete: (id:string)=>void;
}

const FlashcardListItem: React.FC<FlashcardListItemProps> = ({ card, onEdit, onDelete }) => (
  <div className="fc-tile">
    <div className="fc-tile-head">
      <div className="fc-pills">
        <span className="pill topic">{card.topic}</span>
        <span className={`pill diff d${card.stats?.difficulty || 3}`}>Z{card.stats?.difficulty || 3}</span>
        <span className="pill rate">{card.successRate ?? 0}%</span>
      </div>
      <div className="fc-actions">
        <Tooltip title="Düzenle"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEdit(card)} /></Tooltip>
        <Popconfirm title="Silinsin mi?" onConfirm={() => onDelete(card._id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </div>
    <div className="fc-question">
      <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'Devamı' }}>{card.question}</Typography.Paragraph>
    </div>
    <Divider className="fc-divider" plain>Cevap</Divider>
    <div className="fc-answer markdown-answer">
      <ReactMarkdown>{card.answer}</ReactMarkdown>
    </div>
    <div className="fc-meta meta-row">
      <span>Gösterim: {card.stats?.timesShown ?? 0}</span>
      <span>Doğru: {card.stats?.timesCorrect ?? 0}</span>
    </div>
  </div>
);

export default FlashcardListItem;
