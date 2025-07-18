import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PWAStatusBar } from "@/components/PWAManager";
import { Sparkles, TrendingUp, Calendar, Settings, Shield, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function Header() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { label: "Prédictions", icon: TrendingUp, path: "/" },
    { label: "Admin", icon: Shield, path: "/admin" },
    { label: "Historique", icon: Calendar, path: "/history" }
  ];

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Lotto Bonheur Oracle
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Analyse intelligente des tirages
                </p>
              </div>
            </div>
          </div>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-center gap-3">
            <PWAStatusBar />

            {navigationItems.map((item) => (
              <Button
                key={item.path}
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}

            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation mobile */}
          <div className="md:hidden flex items-center gap-2">
            <PWAStatusBar />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border">
            <div className="flex flex-col gap-2 pt-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className="justify-start gap-2"
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
              <Button variant="ghost" className="justify-start gap-2">
                <Settings className="h-4 w-4" />
                Paramètres
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}