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

export function AppSidebar() {
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
      <SidebarHeader className={`border-b border-sidebar-border py-4 ${isCollapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
            <img 
              src="/SmartCRM/4.svg" 
              alt="SmartCRM Logo" 
              className="h-full w-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-sidebar-foreground truncate">
                {settings?.centerName || "Образовательный Центр"}
              </h2>
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

      <SidebarFooter className={`border-t border-sidebar-border ${isCollapsed ? "p-2" : "p-4"}`}>
        {!isCollapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-sidebar-foreground">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={`${isCollapsed ? "w-full justify-center" : "w-full justify-start gap-3"}`}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Выйти</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
