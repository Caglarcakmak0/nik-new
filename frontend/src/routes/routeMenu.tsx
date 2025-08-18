import type { MenuItemEx, Role } from './menuTypes';
import { composeMenuByRole, getPageTitleFromMenu } from './menuUtils';

export const getRouteMenuByRole = (userRole: Role | undefined): MenuItemEx[] => composeMenuByRole(userRole);

// Legacy export for backward compatibility (base menu only)
export const routeMenu: MenuItemEx[] = composeMenuByRole(undefined);

// Role-aware title finder (falls back to base menu if items not provided)
export const getPageTitle = (pathname: string, items?: MenuItemEx[]): string => {
  return getPageTitleFromMenu(pathname, items || routeMenu);
};
