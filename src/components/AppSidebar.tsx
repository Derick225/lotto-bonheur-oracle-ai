import { useState } from "react";
import { 
  Home, 
  Database, 
  BarChart3, 
  Brain, 
  History, 
  Settings,
  Shield,
  HelpCircle
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const mainItems = [
  { title: "Accueil", url: "/", icon: Home },
  { title: "Administration", url: "/admin", icon: Shield },
];

const analysisItems = [
  { title: "Données", url: "/draw/euromillions/data", icon: Database },
  { title: "Statistiques", url: "/draw/euromillions/stats", icon: BarChart3 },
  { title: "Prédictions", url: "/draw/euromillions/prediction", icon: Brain },
  { title: "Historique", url: "/draw/euromillions/history", icon: History },
];

export function AppSidebar() {
  const sidebarContext = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path);
  
  const getNavCls = (path: string) =>
    isActive(path) ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent>
        {/* Logo/Titre */}
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg text-primary">
            Lotto Oracle AI
          </h2>
          <p className="text-xs text-muted-foreground">
            Analyse & Prédictions
          </p>
        </div>

        {/* Navigation principale */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls(item.url)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.title === "Administration" && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Admin
                          </Badge>
                        )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Outils d'analyse */}
        <SidebarGroup>
          <SidebarGroupLabel>Outils d'Analyse</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysisItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls(item.url)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section Aide */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <HelpCircle className="h-4 w-4" />
                  <span>Aide & Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}