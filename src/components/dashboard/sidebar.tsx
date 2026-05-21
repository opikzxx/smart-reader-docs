'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Upload,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Upload',
    href: '/dashboard/documents/upload',
    icon: Upload,
  },
];



interface DashboardSidebarProps {
  user?: {
    name?: string | null;
    image?: string | null;
    email?: string | null;
  };
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-foreground"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Smart Doc Reader</span>
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — desktop: inset style, mobile: slide-over */}
      <aside
        className={cn(
          // Base styles
          'fixed z-50 flex h-full flex-col bg-sidebar transition-transform duration-300 ease-in-out',
          // Desktop: inset sidebar with rounded corners and margin
          'md:static md:m-2 md:h-[calc(100%-16px)] md:w-[250px] md:rounded-xl md:border md:border-sidebar-border md:shadow-sm md:translate-x-0',
          // Mobile: full-height slide from left
          'top-0 left-0 w-[280px] border-r border-sidebar-border',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">
              Smart Doc Reader
            </span>
          </Link>
          {/* Close button on mobile */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <SidebarLink
              key={item.href}
              {...item}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4">
          <Separator className="my-3 bg-sidebar-border" />

          {/* User info */}
          <UserSection user={user} />
        </div>
      </aside>
    </>
  );
}

/* ─── Sidebar Link ─── */
function SidebarLink({
  href,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();

  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

/* ─── User Section ─── */
function UserSection({ user }: { user?: DashboardSidebarProps['user'] }) {
  const displayName = user?.name || user?.email || 'User';

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <Avatar src={user?.image} name={displayName} size={34} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {displayName}
        </p>
        {user?.email && (
          <p className="truncate text-[11px] text-sidebar-foreground/50">
            {user.email}
          </p>
        )}
      </div>
      <button
        onClick={() => signOut({ redirectTo: '/login' })}
        className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
