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

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Лиды",
    url: "/leads",
    icon: UserPlus,
  },
  {
    title: "Учителя",
    url: "/teachers",
    icon: GraduationCap,
  },
  {
    title: "Ученики",
    url: "/students",
    icon: Users,
  },
  {
    title: "Расписание",
    url: "/schedule",
    icon: Calendar,
  },
  {
    title: "Группы",
    url: "/groups",
    icon: UsersRound,
  },
  {
    title: "Индивидуальные",
    url: "/individual-lessons",
    icon: UserCheck,
  },
  {
    title: "Финансы",
    url: "/finance",
    icon: DollarSign,
  },
  {
    title: "Абонементы",
    url: "/subscriptions",
    icon: Ticket,
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { logout, user } = useAuth();

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
              {navItems.map((item) => (
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
