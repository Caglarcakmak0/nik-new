import {
  DashboardOutlined,
  UserOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ProfileOutlined,
  TeamOutlined,
  FileTextOutlined,
  BookOutlined,
  ExperimentOutlined,
  BulbOutlined,
  GlobalOutlined,
  QuestionCircleOutlined,
  CompassOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import type { MenuItemEx, Role } from "./menuTypes";

// Tüm menü tek bir listede, her öğe hangi roller görebiliyorsa roles ile tanımlı
export const allMenuItems: MenuItemEx[] = [
  // Dashboard (öğrenci/admin)
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
    roles: ["student"],
  },
  // Coach Dashboard
  {
    key: "/coach-dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard (Koç)",
    roles: ["coach"],
  },
  // Coach placeholders (plan ile hizalı, henüz sayfa yok → disabled)
  {
    key: "/coach/students",
    icon: <TeamOutlined />,
    label: "Öğrenci Yönetimi",
    roles: ["coach"],
    disabled: false
  },
  {
    key: "/coach/programs",
    icon: <CalendarOutlined />,
    label: "Program Yönetimi",
    roles: ["coach"],
    disabled: false
  },
  {
    key: "/coach/reports",
    icon: <FileTextOutlined />,
    label: "Raporlar",
    roles: ["coach"],
    disabled: true
  },

  // Profil ve alt öğeler
  {
    key: "profile",
    icon: <UserOutlined />,
    label: "Profil",
    roles: ["student", "coach", "admin"],
    children: [
      {
        key: "/profile",
        label: "Kişisel Bilgiler",
        roles: ["student", "coach", "admin"],
      },
      { key: "/education", label: "Eğitim Bilgileri", roles: ["student"] },
      { key: "/goals", label: "Hedeflerim", roles: ["student"] },
    ],
  },

  // Öğrenciye özel sayfalar
  {
    key: "/study-tracker",
    icon: <ExperimentOutlined />,
    label: "Çalışma Tracker",
    roles: ["student"],
  },
  {
    key: "/study-plan",
    icon: <BookOutlined />,
    label: "Çalışma Programı",
    roles: ["student"],
  },
  {
    key: "/topic-matrix",
    icon: <CompassOutlined />,
    label: "Konu Matrisi",
    roles: ["student", "coach"],
  },
  {
    key: "/student/exams",
    icon: <TrophyOutlined />,
    label: "Denemelerim",
    roles: ["student"],
  },
  {
    key: "/student/coach",
    icon: <BulbOutlined />,
    label: "Koçum",
    roles: ["student"],
  },

  // Admin sayfaları
  {
    key: "/admin-dashboard",
    icon: <DashboardOutlined />,
    label: "Admin Dashboard",
    roles: ["admin"],
  },
  {
    key: "/admin/users",
    icon: <UserOutlined />,
    label: "Kullanıcı Yönetimi",
    roles: ["admin"],
    disabled: true
  },
  {
    key: "/admin/coaches",
    icon: <TeamOutlined />,
    label: "Koç Yönetimi",
    roles: ["admin"],
    disabled: false
  },
  {
    key: "/admin/statistics",
    icon: <QuestionCircleOutlined />,
    label: "Feedbackler",
    roles: ["admin"],
    disabled: false
  },
  
  {
    key: "/admin/assignments",
    icon: <TeamOutlined />,
    label: "Atama Yönetimi",
    roles: ["admin"],
    disabled: false
  },
];

// Role'a göre menü ağacını filtrele
export const filterMenuByRole = (
  items: MenuItemEx[],
  role?: Role
): MenuItemEx[] => {
  const filterItem = (item: MenuItemEx): MenuItemEx | null => {
    const allowed = !item.roles || (role && item.roles.includes(role));
    if (!allowed) return null;

    if (item.children && item.children.length) {
      const filteredChildren = filterMenuByRole(
        item.children as MenuItemEx[],
        role
      );
      if (filteredChildren.length === 0)
        return { ...item, children: undefined } as MenuItemEx;
      return { ...item, children: filteredChildren } as MenuItemEx;
    }
    return item;
  };

  return items
    .map((i) => (i ? filterItem(i as MenuItemEx) : null))
    .filter(Boolean) as MenuItemEx[];
};

// Role'e göre kompoze menü
export const composeMenuByRole = (userRole: Role | undefined): MenuItemEx[] => {
  return filterMenuByRole(allMenuItems, userRole);
};

// Utility: find title by key in a role-aware menu
export const getPageTitleFromMenu = (
  pathname: string,
  items: MenuItemEx[]
): string => {
  const findTitle = (list: MenuItemEx[], path: string): string | null => {
    for (const item of list) {
      if (
        item &&
        typeof item === "object" &&
        "key" in item &&
        (item as any).key === path
      ) {
        return (item as any).label as string;
      }
      if (
        item &&
        typeof item === "object" &&
        "children" in item &&
        item.children
      ) {
        const childTitle = findTitle(item.children as MenuItemEx[], path);
        if (childTitle) return childTitle;
      }
    }
    return null;
  };

  return findTitle(items, pathname) || "YKS Portal";
};
