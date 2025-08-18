import React from 'react';
import { Button, Space } from 'antd';
import { 
  ThunderboltOutlined, 
  SmileOutlined, 
  MehOutlined, 
  FrownOutlined,
  HeartOutlined,

} from '@ant-design/icons';

type MoodType = 'Enerjik' | 'Normal' | 'Yorgun' | 'Motivasyonsuz' | 'Stresli' | 'Mutlu';

interface MoodOption {
  value: MoodType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface MoodSelectorProps {
  value?: MoodType;
  onChange?: (mood: MoodType) => void;
  disabled?: boolean;
  size?: 'small' | 'default' | 'large';
}

const MoodSelector: React.FC<MoodSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'default'
}) => {
  const moodOptions: MoodOption[] = [
    {
      value: 'Enerjik',
      label: 'Enerjik',
      icon: <ThunderboltOutlined />,
      color: '#52c41a'
    },
    {
      value: 'Mutlu',
      label: 'Mutlu',
      icon: <HeartOutlined />,
      color: '#eb2f96'
    },
    {
      value: 'Normal',
      label: 'Normal',
      icon: <SmileOutlined />,
      color: '#1890ff'
    },
    {
      value: 'Yorgun',
      label: 'Yorgun',
      icon: <MehOutlined />,
      color: '#faad14'
    },
    {
      value: 'Stresli',
      label: 'Stresli',
      icon: <FrownOutlined />,
      color: '#ff7a45'
    },
    {
      value: 'Motivasyonsuz',
      label: 'Motivasyonsuz',
      icon: <FrownOutlined />,
      color: '#f5222d'
    }
  ];

  const handleMoodSelect = (mood: MoodType) => {
    onChange?.(mood);
  };

  return (
    <div className="mood-selector">
      <div className="mood-selector__label">
        Ruh Halin Nasıldı?
      </div>
      <Space wrap size="small" className="mood-selector__options">
        {moodOptions.map((option) => (
          <Button
            key={option.value}
            size={size as any}
            type={value === option.value ? 'primary' : 'default'}
            icon={option.icon}
            disabled={disabled}
            onClick={() => handleMoodSelect(option.value)}
            style={{
              borderColor: value === option.value ? option.color : undefined,
              backgroundColor: value === option.value ? option.color : undefined,
              color: value === option.value ? '#fff' : option.color
            }}
          >
            {option.label}
          </Button>
        ))}
      </Space>
    </div>
  );
};

export default MoodSelector;