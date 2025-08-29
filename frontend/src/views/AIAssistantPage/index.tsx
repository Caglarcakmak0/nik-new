import React from 'react';
import { Row, Col } from 'antd';
import AIChatPanel from '../../components/AIChat/AIChatPanel';

const AIAssistantPage: React.FC = () => {
  return (
    <Row gutter={16}>
      <Col span={16}>
        <AIChatPanel />
      </Col>
      <Col span={8}>
        {/* Gelecekte: kişisel öneriler, çalışma özeti vb. */}
        <div style={{padding:16}}>
          <h3>Öneriler (Beta)</h3>
          <p>Bu panel ileride AI tarafından üretilen kişiselleştirilmiş çalışma planı önerilerini gösterecek.</p>
        </div>
      </Col>
    </Row>
  );
};

export default AIAssistantPage;
