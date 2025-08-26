import React from 'react';
import { Modal, Form, Row, Col, Input, Select } from 'antd';

const { Option } = Select;

interface CreateUserModalProps {
  open: boolean;
  form: any;
  onCancel(): void;
  onCreate(): Promise<void> | void;
  confirmLoading?: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ open, form, onCancel, onCreate, confirmLoading }) => (
  <Modal
    title="Yeni Kullanıcı Oluştur"
    open={open}
    onCancel={onCancel}
    okText="Oluştur"
    confirmLoading={confirmLoading}
    onOk={onCreate}
  >
    <Form layout="vertical" form={form} initialValues={{ role: 'student' }}>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="firstName" label="Ad">
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="lastName" label="Soyad">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email', message: 'Geçerli bir e-posta girin' }]}>
        <Input />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="password" label="Şifre" rules={[{ required: true, message: 'Şifre gerekli' }, { min: 6, message: 'En az 6 karakter' }]}>
            <Input.Password />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}> 
            <Select>
              <Option value="student">Öğrenci</Option>
              <Option value="coach">Koç</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Modal>
);

export default CreateUserModal;
