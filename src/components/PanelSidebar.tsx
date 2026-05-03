import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Server, Shield, Network, Egg, Users, Settings, Terminal, FileCode } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const userItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Servers", url: "/servers", icon: Server },
  { title: "Console", url: "/console", icon: Terminal },
  { title: "Nodes", url: "/nodes", icon: Network },
];

const adminItems = [
  { title: "Admin Overview", url: "/admin", icon: Shield },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Eggs", url: "/admin/eggs", icon: Egg },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function PanelSidebar({ isAdmin }: { isAdmin: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => path === url;

  const renderItems = (items: typeof userItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <Link to={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            H
          </div>
          <div className="font-semibold tracking-tight">Hilos Panel</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(userItems)}</SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(adminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
