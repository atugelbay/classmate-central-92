import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  UsersRound,
  Settings,
  LogOut,
  UserPlus,
  DollarSign,
  Ticket,
  UserCheck,
  Shield,
  RefreshCcw,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSettings } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: string;
  roles?: string[]; // Optional role restriction
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    permission: "dashboard.view",
    roles: ["admin", "manager"], // Only admin and manager can access Dashboard
  },
  {
    title: "Лиды",
    url: "/leads",
    icon: UserPlus,
    permission: "leads.view",
  },
  {
    title: "Учителя",
    url: "/teachers",
    icon: GraduationCap,
    permission: "teachers.view",
  },
  {
    title: "Ученики",
    url: "/students",
    icon: Users,
    permission: "students.view",
  },
  {
    title: "Расписание",
    url: "/schedule",
    icon: Calendar,
    permission: "schedule.view",
  },
  {
    title: "Группы",
    url: "/groups",
    icon: UsersRound,
    permission: "groups.view",
  },
  {
    title: "Индивидуальные",
    url: "/individual-lessons",
    icon: UserCheck,
    permission: "lessons.view",
  },
  {
    title: "Финансы",
    url: "/finance",
    icon: DollarSign,
    permission: "finance.view",
  },
  {
    title: "Абонементы",
    url: "/subscriptions",
    icon: Ticket,
    permission: "subscriptions.view",
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
    permission: "settings.view",
  },
  {
    title: "Роли и права",
    url: "/roles",
    icon: Shield,
    permission: "roles.view",
  },
];

interface AppSidebarProps {
  onRestartOnboarding?: () => void;
}

export function AppSidebar({ onRestartOnboarding }: AppSidebarProps) {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { logout, user, hasPermission } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      {/* Logo with more breathing room */}
      <SidebarHeader className={`pt-6 pb-4 ${isCollapsed ? "px-3" : "px-5"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <img 
              src="/Neosmart/logo.png" 
              alt="Neosmart Logo" 
              className="h-9 w-9 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {settings?.centerName || "Neosmart"}
              </h2>
              <p className="text-[10px] text-slate-400">Учебный центр</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Навигация
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => {
                  // Check role restriction first (if specified)
                  if (item.roles && user?.roles) {
                    const userRoleNames = user.roles.map(r => r.name.toLowerCase());
                    const hasRequiredRole = item.roles.some(role => userRoleNames.includes(role.toLowerCase()));
                    if (!hasRequiredRole) return false;
                  }
                  // Then check permission
                  if (!item.permission) return true;
                  if (!user || !user.permissions || user.permissions.length === 0) return false;
                  return hasPermission(item.permission);
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3"
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Minimalist profile footer */}
      <SidebarFooter className={`mt-auto border-t border-slate-200 dark:border-slate-800 ${isCollapsed ? "p-2" : "p-4"}`}>
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-xs font-semibold text-white">
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        {isCollapsed && user && (
          <div className="flex justify-center mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-xs font-semibold text-white">
              {user.name?.charAt(0) || "U"}
            </div>
          </div>
        )}
        <div className={`flex ${isCollapsed ? "flex-col" : ""} gap-1`}>
          {onRestartOnboarding && (
            <Button
              variant="ghost"
              size="sm"
              className={`${isCollapsed ? "w-full justify-center" : "flex-1 justify-center"} text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800`}
              onClick={onRestartOnboarding}
            >
              <RefreshCcw className="h-4 w-4" />
              {!isCollapsed && <span className="sr-only">Онбординг</span>}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`${isCollapsed ? "w-full justify-center" : "flex-1 justify-center"} text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30`}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="sr-only">Выйти</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
