import { NavLink } from "react-router-dom";
import { Building2, FileText, Calculator, Receipt, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const navItems = [
    { to: "/", label: "Dashboard", icon: Building2 },
    { to: "/estimates", label: "Estimates", icon: Calculator },
    { to: "/quotes", label: "Quotes", icon: FileText },
    { to: "/expenses", label: "Expenses", icon: Receipt },
    { to: "/vendors", label: "Vendors", icon: Users },
    { to: "/profit-analysis", label: "Profit Analysis", icon: TrendingUp },
  ];

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Construction Profit Tracker</h1>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
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
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;