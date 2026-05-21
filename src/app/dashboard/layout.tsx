import { auth } from '@/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="dark-dashboard flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar (inset on desktop, slide-over on mobile) */}
      <DashboardSidebar
        user={user ? { name: user.name, image: user.image, email: user.email } : undefined}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 pb-6 pt-[72px] md:px-8 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
