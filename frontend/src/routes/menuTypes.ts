import type { MenuProps } from 'antd';

export type Role = 'admin' | 'coach' | 'student';
export type PlanTier = 'free' | 'premium';

export type MenuItem = Required<MenuProps>['items'][number];

// Extended Menu Item with optional roles, plan tiers and recursive children typing
export type MenuItemEx = NonNullable<MenuItem> & {
  roles?: Role[];
  // If provided, menu item only visible for these plan tiers (students). For non-student roles ignored.
  plans?: PlanTier[];
  children?: MenuItemEx[];
};


