import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetUser, getGetUserQueryKey } from "@workspace/api-client-react";
import { Building2, LayoutDashboard, FileText, Settings, LogOut, Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const userIdStr = localStorage.getItem("grantai_user_id");
  const userId = userIdStr ? parseInt(userIdStr, 10) : null;

  useEffect(() => {
    if (!userId && location !== "/" && location !== "/onboard") {
      setLocation("/");
    }
  }, [userId, location, setLocation]);

  const { data: user, isLoading } = useGetUser(userId || 0, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId || 0) },
  });

  const handleLogout = () => {
    localStorage.removeItem("grantai_user_id");
    setLocation("/");
  };

  const NavLinks = () => (
    <>
      <Link href="/dashboard">
        <Button
          variant={location === "/dashboard" ? "secondary" : "ghost"}
          className={`w-full justify-start ${location === "/dashboard" ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="nav-dashboard"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/applications">
        <Button
          variant={location.startsWith("/applications") ? "secondary" : "ghost"}
          className={`w-full justify-start ${location.startsWith("/applications") ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-muted-foreground hover:text-foreground"}`}
          data-testid="nav-applications"
        >
          <FileText className="mr-2 h-4 w-4" />
          Applications
        </Button>
      </Link>
    </>
  );

  if (isLoading && userId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <div className="flex items-center gap-2 px-2 pb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">GrantAI</span>
        </div>
        
        <div className="flex-1 space-y-1">
          <NavLinks />
        </div>

        {user && (
          <div className="mt-auto border-t border-border pt-4">
            <div className="mb-4 px-2">
              <p className="text-sm font-medium leading-none text-foreground">{user.orgName}</p>
              <p className="text-xs text-muted-foreground">{user.orgType}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">GrantAI</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-6">
              <div className="flex items-center gap-2 pb-8">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">GrantAI</span>
              </div>
              <div className="space-y-1">
                <NavLinks />
              </div>
              {user && (
                <div className="absolute bottom-6 left-6 right-6 border-t border-border pt-4">
                  <div className="mb-4">
                    <p className="text-sm font-medium leading-none text-foreground">{user.orgName}</p>
                    <p className="text-xs text-muted-foreground">{user.orgType}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
