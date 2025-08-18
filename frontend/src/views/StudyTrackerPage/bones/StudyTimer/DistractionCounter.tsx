import React from 'react';
import { Button, InputNumber, Space, Typography } from 'antd';
import { MinusOutlined, PlusOutlined, PhoneOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DistractionCounterProps {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: 'small' | 'default' | 'large';
  max?: number;
}

const DistractionCounter: React.FC<DistractionCounterProps> = ({
  value = 0,
  onChange,
  disabled = false,
  size = 'default',
  max = 50
}) => {
  const handleDecrease = () => {
    const newValue = Math.max(0, value - 1);
    onChange?.(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + 1);
    onChange?.(newValue);
  };

  const handleDirectChange = (newValue: number | null) => {
    if (newValue === null) return;
    const clampedValue = Math.max(0, Math.min(max, newValue));
    onChange?.(clampedValue);
  };

  const getDistractionLevel = () => {
    if (value === 0) return { text: 'Hiç dikkat dağınıklığı yok', color: '#52c41a' };
    if (value <= 2) return { text: 'Çok az', color: '#73d13d' };
    if (value <= 5) return { text: 'Az', color: '#faad14' };
    if (value <= 10) return { text: 'Orta', color: '#ff7a45' };
    if (value <= 20) return { text: 'Fazla', color: '#ff4d4f' };
    return { text: 'Çok fazla', color: '#a8071a' };
  };

  const level = getDistractionLevel();

  return (
    <div className="distraction-counter">
      <div className="distraction-counter__label">
        <PhoneOutlined style={{ marginRight: 8 }} />
        Kaç Kez Dikkatın Dağıldı?
      </div>
      
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space size="middle" align="center">
          <Button
            size={size}
            icon={<MinusOutlined />}
            disabled={disabled || value <= 0}
            onClick={handleDecrease}
          />
          
          <InputNumber
            size={size}
            value={value}
            onChange={handleDirectChange}
            disabled={disabled}
            min={0}
            max={max}
            style={{ width: 80, textAlign: 'center' }}
          />
          
          <Button
            size={size}
            icon={<PlusOutlined />}
            disabled={disabled || value >= max}
            onClick={handleIncrease}
          />
        </Space>

        <div className="distraction-counter__level">
          <Text style={{ color: level.color, fontSize: '14px', fontWeight: 500 }}>
            {level.text}
          </Text>
        </div>

        {value > 0 && (
          <div className="distraction-counter__hint">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Telefon, bildirim, gürültü gibi dikkat dağıtan faktörler
            </Text>
          </div>
        )}
      </Space>
    </div>
  );
};

export default DistractionCounter;