import type { MenuProps } from 'antd';

export type Role = 'admin' | 'coach' | 'student';

export type MenuItem = Required<MenuProps>['items'][number];

// Extended Menu Item with optional roles and recursive children typing
export type MenuItemEx = NonNullable<MenuItem> & {
  roles?: Role[];
  children?: MenuItemEx[];
};


