import React from 'react';
import { Switch, Tooltip } from 'antd';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC<{ inline?: boolean }> = ({ inline }) => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Tooltip title={isDark ? 'Açık moda geç' : 'Koyu moda geç'}>
      <Switch
        checked={isDark}
        onChange={toggleTheme}
        style={inline ? {} : { boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }}
      />
    </Tooltip>
  );
};

export default ThemeToggle;
