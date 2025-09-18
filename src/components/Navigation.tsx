import { NavLink } from "react-router-dom";
import { Building2, FileText, Calculator, Receipt, TrendingUp, Users, Wrench, Settings, Menu, MoreHorizontal, ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const Navigation = () => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  // Primary items (always visible on larger screens)
  const primaryItems = [
    { to: "/", label: "Dashboard", icon: Building2 },
    { to: "/work-orders", label: "Work Orders", icon: Wrench },
    { to: "/projects", label: "Projects", icon: Building2 },
    { to: "/expenses", label: "Expenses", icon: Receipt },
  ];

  // Secondary items (grouped under "More" dropdown)
  const secondaryItems = [
    { to: "/estimates", label: "Estimates", icon: Calculator },
    { to: "/quotes", label: "Quotes", icon: FileText },
    { to: "/payees", label: "Payees", icon: Users },
    { to: "/profit-analysis", label: "Profit Analysis", icon: TrendingUp },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  const allItems = [...primaryItems, ...secondaryItems];

  const NavItem = ({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: any; onClick?: () => void }) => (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground hidden sm:block">
              Construction Profit Tracker
            </h1>
            <h1 className="text-xl font-bold text-foreground sm:hidden">
              CPT
            </h1>
          </div>
          
          {/* Mobile Navigation */}
          {isMobile ? (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col space-y-2 mt-6">
                {allItems.map(({ to, label, icon: Icon }) => (
                  <NavItem 
                    key={to} 
                    to={to} 
                    label={label} 
                    icon={Icon} 
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
                
                {/* Mobile User Section */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
              </SheetContent>
            </Sheet>
          ) : (
            /* Desktop Navigation */
            <div className="flex items-center space-x-1">
              {/* Primary Items */}
              {primaryItems.map(({ to, label, icon: Icon }) => (
                <NavItem key={to} to={to} label={label} icon={Icon} />
              ))}
              
              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4 mr-1" />
                    More
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {secondaryItems.map(({ to, label, icon: Icon }) => (
                    <DropdownMenuItem key={to} asChild>
                      <NavLink
                        to={to}
                        className="flex items-center space-x-2 px-2 py-2 text-sm font-medium cursor-pointer w-full"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </NavLink>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:bg-muted hover:text-foreground">
                    <User className="h-4 w-4 mr-1" />
                    Profile
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;