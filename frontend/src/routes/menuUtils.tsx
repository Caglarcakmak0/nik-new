import {
  DashboardOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
  FileTextOutlined,
  BookOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  CompassOutlined,
  TrophyOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import type { MenuItemEx, Role, PlanTier } from "./menuTypes";

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
  // Çalışma araçları üst seviye (alt menü kaldırıldı)
  {
    key: "/study-tracker/timer",
    icon: <ClockCircleOutlined />,
    label: "Zamanlayıcı",
    roles: ["student"],
  },
  {
    key: "/study-tracker/sessions",
    icon: <HistoryOutlined />,
    label: "Oturum Geçmişi",
    roles: ["student"],
  },
  {
    key: "/study-tracker/calendar",
    icon: <CalendarOutlined />,
    label: "Takvim",
    roles: ["student"],
  },
  {
    key: "/study-tracker/study-room",
    icon: <TrophyOutlined />,
    label: "Kütüphane",
    roles: ["student"],
  },
  {
    key: "/weekly-plan",
    icon: <CalendarOutlined />,
    label: "Haftalık Plan",
    roles: ["student"],
    plans: ["free"], // yalnızca free öğrenciler
  },
  {
    key: "/study-plan",
    icon: <BookOutlined />,
	label: "Günlük Programlar",
    roles: ["student"],
    plans: ["premium"], // yalnızca premium öğrenciler
  },
  {
    key: "/topic-matrix",
    icon: <CompassOutlined />,
  label: "Konu Takibi",
    roles: ["student", "coach"],
  },
  // Denemelerim sayfası kaldırıldı; deneme ekleme/görüntüleme StudyCalendar modalına taşındı
  {
    key: "/student/coach",
    icon: <BulbOutlined />,
    label: "Koçum",
    roles: ["student"],
  },
  {
    key: "/flashcards",
    icon: <BookOutlined />,
    label: "Hatırlatma Kartları",
    roles: ["student"],
  },
  {
    key: "/study-plan/achievements",
    icon: <TrophyOutlined />,
    label: "Rozetlerim",
    roles: ["student"],
  },
  {
    key: "/habits",
    icon: <ClockCircleOutlined />,
    label: "Alışkanlıklarım",
    roles: ["student"],
  },
  {
    key: "/exam-tracker",
    icon: <HistoryOutlined />,
    label: "Deneme Takibi",
    roles: ["student"],
  },
  {
    key: "/ai-assistant",
    icon: <BulbOutlined />,
    label: "AI Asistan",
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
  role?: Role,
  planTier?: PlanTier
): MenuItemEx[] => {
  const filterItem = (item: MenuItemEx): MenuItemEx | null => {
    // Role bazlı görünürlük
    const allowedByRole = !item.roles || (role && item.roles.includes(role));
    if (!allowedByRole) return null;

    // Plan bazlı görünürlük (sadece öğrenci için uygula; koç/admin için es geç)
    const applyPlan = role === 'student';
    const allowedByPlan = !applyPlan || !item.plans || (planTier && item.plans.includes(planTier));
    if (!allowedByPlan) return null;

    if (item.children && item.children.length) {
      const filteredChildren = filterMenuByRole(
        item.children as MenuItemEx[],
        role,
        planTier
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
export const composeMenuByRole = (userRole: Role | undefined, planTier?: PlanTier): MenuItemEx[] => {
  return filterMenuByRole(allMenuItems, userRole, planTier);
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
