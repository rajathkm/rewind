"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Download,
  Clock,
  Settings,
  Plus,
  Library,
  Rss,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { RewindIcon } from "@/components/ui/rewind-icon";
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
  { href: "/content", icon: Library, label: "Library" },
  { href: "/search", icon: Search, label: "Search" },
];

const libraryItems: NavItem[] = [
  { href: "/subscriptions", icon: Rss, label: "Sources" },
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
        "flex flex-col",
        "bg-sidebar-background border-r border-sidebar-border",
        "transition-all duration-300 ease-out",
        sidebarCollapsed ? "w-[72px]" : "w-72",
        className
      )}
    >
      {/* Logo */}
      <div className="min-h-[72px] flex items-center px-4 py-3 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex-shrink-0">
            <RewindIcon
              size={sidebarCollapsed ? "sm" : "md"}
              className="group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] blur-lg opacity-40 -z-10 group-hover:opacity-60 transition-opacity" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-sidebar-foreground">Rewind</span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">Knowledge Distilled</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Add Source Button */}
        <Button
          asChild
          variant="gradient"
          className={cn(
            "w-full",
            sidebarCollapsed ? "px-0 aspect-square" : ""
          )}
          size={sidebarCollapsed ? "icon" : "default"}
        >
          <Link href="/subscriptions?add=true">
            <Plus className="h-4 w-4" />
            {!sidebarCollapsed && <span>Add Source</span>}
          </Link>
        </Button>

        {/* Main Navigation */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <h3 className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Navigate
            </h3>
          )}
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
            <h3 className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
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
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Theme Toggle */}
        <div className={cn(
          "flex items-center",
          sidebarCollapsed ? "justify-center" : "px-3"
        )}>
          {sidebarCollapsed ? (
            <ThemeToggle variant="icon" className="text-sidebar-foreground/70 hover:text-sidebar-foreground" />
          ) : (
            <ThemeToggle variant="switch" />
          )}
        </div>

        <NavLink
          item={{ href: "/settings", icon: Settings, label: "Settings" }}
          pathname={pathname}
          collapsed={sidebarCollapsed}
        />

        {/* Connection Status */}
        {!isOnline && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/10",
              "text-sm font-medium text-warning",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            {!sidebarCollapsed && <span>Offline Mode</span>}
          </div>
        )}

        {/* Version/Status indicator */}
        {!sidebarCollapsed && isOnline && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/60">
            <div className="status-dot online" />
            <span>Connected</span>
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
        "flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "text-sm font-medium",
        "transition-all duration-200",
        "group",
        collapsed && "justify-center px-2.5",
        isActive
          ? [
              "bg-sidebar-primary/10 text-sidebar-primary",
              "shadow-sm shadow-sidebar-primary/5",
            ].join(" ")
          : [
              "text-sidebar-foreground/70",
              "hover:bg-sidebar-accent hover:text-sidebar-foreground",
            ].join(" ")
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className={cn(
        "w-5 h-5 flex-shrink-0 transition-transform duration-200",
        !isActive && "group-hover:scale-110"
      )} />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-sidebar-primary text-sidebar-primary-foreground rounded-full shadow-sm">
              {badge}
            </span>
          )}
        </>
      )}
      {isActive && collapsed && (
        <span className="absolute left-0 w-1 h-8 rounded-r-full bg-sidebar-primary" />
      )}
    </Link>
  );
}
