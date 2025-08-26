import React from 'react';
import { Modal, Form, Row, Col, Input, Select, Switch } from 'antd';
import { User } from '../types';

const { Option } = Select;

interface EditUserModalProps {
  open: boolean;
  user: User | null;
  form: any;
  onCancel(): void;
  onSave(): Promise<void> | void;
  confirmLoading?: boolean;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ open, user, form, onCancel, onSave, confirmLoading }) => (
  <Modal
    title={user ? `${user.firstName} ${user.lastName} - Düzenle` : 'Kullanıcı Düzenle'}
    open={open}
    onCancel={onCancel}
    okText="Kaydet"
    onOk={onSave}
    confirmLoading={confirmLoading}
  >
    <Form layout="vertical" form={form}>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="firstName" label="Ad" rules={[{ required: true, message: 'Ad gerekli' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="lastName" label="Soyad" rules={[{ required: true, message: 'Soyad gerekli' }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email', message: 'Geçerli bir e-posta girin' }]}>
        <Input />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}> 
            <Select>
              <Option value="student">Öğrenci</Option>
              <Option value="coach">Koç</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="isActive" label="Durum" valuePropName="checked">
            <Switch checkedChildren="Aktif" unCheckedChildren="Pasif" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Modal>
);

export default EditUserModal;
