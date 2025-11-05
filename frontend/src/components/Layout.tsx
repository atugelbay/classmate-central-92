import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { HeaderSearch } from "@/components/HeaderSearch";
import { NotificationDropdown } from "@/components/NotificationDropdown";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger />
            <HeaderSearch />
            <div className="flex-1" />
            <NotificationDropdown />
          </header>
          <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
