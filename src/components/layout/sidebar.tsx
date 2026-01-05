"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  BookOpen,
  Compass,
  Download,
  Clock,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useOfflineStore } from "@/stores/offline-store";
import { useUIStore } from "@/stores/ui-store";
import { useShallow } from "zustand/react/shallow";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/search", icon: Search, label: "Search" },
];

const libraryItems: NavItem[] = [
  { href: "/subscriptions", icon: BookOpen, label: "Subscriptions" },
  { href: "/settings/offline", icon: Download, label: "Downloads" },
  { href: "/history", icon: Clock, label: "History" },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();
  const { isOnline, activeDownloads } = useOfflineStore(
    useShallow((state) => ({
      isOnline: state.isOnline,
      activeDownloads: state.activeDownloads,
    }))
  );

  return (
    <aside
      className={cn(
        "bg-background flex flex-col border-r transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">R</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-lg">Rewind</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {/* Add Source Button */}
        <Button
          asChild
          className={cn("w-full", sidebarCollapsed && "px-0")}
          size={sidebarCollapsed ? "icon" : "default"}
        >
          <Link href="/subscriptions?add=true">
            <Plus className="h-4 w-4" />
            {!sidebarCollapsed && <span>Add Source</span>}
          </Link>
        </Button>

        {/* Main Navigation */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={sidebarCollapsed}
            />
          ))}
        </div>

        {/* Library Section */}
        <div>
          {!sidebarCollapsed && (
            <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Library
            </h3>
          )}
          <div className="space-y-1">
            {libraryItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={sidebarCollapsed}
                badge={
                  item.href === "/settings/offline" && activeDownloads > 0
                    ? activeDownloads
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        <NavLink
          item={{ href: "/settings", icon: Settings, label: "Settings" }}
          pathname={pathname}
          collapsed={sidebarCollapsed}
        />

        {/* Connection Status */}
        {!isOnline && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 text-sm text-amber-500",
              sidebarCollapsed && "justify-center"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {!sidebarCollapsed && <span>Offline</span>}
          </div>
        )}
      </div>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  pathname: string;
  collapsed?: boolean;
  badge?: number;
}

function NavLink({ item, pathname, collapsed, badge }: NavLinkProps) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
