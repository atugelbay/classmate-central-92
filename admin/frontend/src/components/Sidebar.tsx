import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Building2,
  Users,
  Database,
  FileText,
  AlertCircle,
  LogOut,
  Shield,
  CreditCard,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/licenses', icon: CreditCard, label: 'Licenses' },
  { to: '/database', icon: Database, label: 'Database' },
  { to: '/logs', icon: FileText, label: 'Logs' },
  { to: '/errors', icon: AlertCircle, label: 'Errors' },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">Admin Panel</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="mb-3 text-sm">
          <p className="font-medium">{user?.username}</p>
          <p className="text-muted-foreground text-xs">{user?.role}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
