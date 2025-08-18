import React from 'react';
import { Rate } from 'antd';
import { StarOutlined } from '@ant-design/icons';

interface QualityRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: 'small' | 'default' | 'large';
}

const QualityRating: React.FC<QualityRatingProps> = ({
  value = 0,
  onChange,
  disabled = false,
  size = 'default'
}) => {
  const getTooltipText = (value: number) => {
    const tooltips = [
      'Çok Kötü',
      'Kötü',
      'Orta',
      'İyi',
      'Mükemmel'
    ];
    return tooltips[value - 1] || '';
  };

  return (
    <div className="quality-rating">
      <div className="quality-rating__label">
        Çalışma Kalitesi
      </div>
      <Rate
        count={5}
        value={value}
        onChange={onChange}
        disabled={disabled}
        character={<StarOutlined />}
        tooltips={['Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel']}
        style={{ 
          fontSize: size === 'large' ? 24 : size === 'small' ? 16 : 20,
          color: '#faad14'
        }}
      />
      {value > 0 && (
        <div className="quality-rating__text">
          {getTooltipText(value)}
        </div>
      )}
    </div>
  );
};

export default QualityRating;