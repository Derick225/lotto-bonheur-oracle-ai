import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Calendar,
  BarChart3,
  TrendingUp,
  Brain,
  Settings,
  Shield,
  Clock,
  Zap,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { DRAW_SCHEDULE, getCurrentDay } from "@/data/drawSchedule";

interface DrawMenuItem {
  name: string;
  time: string;
  day: string;
}

export function AppSidebar() {
  const sidebar = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const currentDay = getCurrentDay();
  const collapsed = sidebar.state === "collapsed";

  const [openDays, setOpenDays] = useState<{ [key: string]: boolean }>({
    [currentDay]: true, // Le jour actuel est ouvert par défaut
  });

  const toggleDay = (day: string) => {
    setOpenDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  const getDrawPath = (drawName: string, section: string = "data") => 
    `/draw/${encodeURIComponent(drawName)}/${section}`;

  // Fonction pour obtenir l'icône du jour
  const getDayIcon = (day: string) => {
    const icons: { [key: string]: any } = {
      "Lundi": Calendar,
      "Mardi": Clock,
      "Mercredi": Zap,
      "Jeudi": BarChart3,
      "Vendredi": TrendingUp,
      "Samedi": Brain,
      "Dimanche": Sparkles,
    };
    return icons[day] || Calendar;
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-80"} collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Sparkles className="h-8 w-8 text-sidebar-primary shrink-0" />
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">
                  Lotto Oracle
                </h1>
                <p className="text-xs text-sidebar-foreground/70">
                  Analyse IA
                </p>
              </div>
            )}
          </div>
        </div>
        {!collapsed && (
          <Badge variant="secondary" className="mt-2 w-fit bg-sidebar-accent/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
            En ligne
          </Badge>
        )}
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Navigation principale */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className={getNavCls}>
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>Accueil</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin" className={getNavCls}>
                    <Shield className="h-4 w-4" />
                    {!collapsed && <span>Administration</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tirages par jour */}
        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Tirages par Jour</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Object.entries(DRAW_SCHEDULE).map(([day, draws]) => {
                  const DayIcon = getDayIcon(day);
                  const isToday = day === currentDay;
                  
                  return (
                    <Collapsible
                      key={day}
                      open={openDays[day]}
                      onOpenChange={() => toggleDay(day)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full justify-between">
                            <div className="flex items-center gap-2">
                              <DayIcon className="h-4 w-4" />
                              <span className="font-medium">{day}</span>
                              {isToday && (
                                <Badge variant="secondary" className="text-xs bg-sidebar-primary/20 text-sidebar-primary">
                                  Aujourd'hui
                                </Badge>
                              )}
                            </div>
                            <ChevronRight 
                              className={`h-4 w-4 transition-transform ${
                                openDays[day] ? 'rotate-90' : ''
                              }`} 
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {Object.entries(draws).map(([time, drawName]) => (
                              <SidebarMenuSubItem key={`${day}-${time}-${drawName}`}>
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton className="w-full justify-between">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span className="text-sm font-medium">{drawName}</span>
                                      </div>
                                      <span className="text-xs text-sidebar-foreground/50">{time}</span>
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="ml-6 space-y-1 mt-1">
                                      <SidebarMenuSubButton asChild>
                                        <NavLink 
                                          to={getDrawPath(drawName, "data")} 
                                          className={getNavCls}
                                        >
                                          <BarChart3 className="h-3 w-3" />
                                          <span className="text-xs">Données</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                      <SidebarMenuSubButton asChild>
                                        <NavLink 
                                          to={getDrawPath(drawName, "consult")} 
                                          className={getNavCls}
                                        >
                                          <TrendingUp className="h-3 w-3" />
                                          <span className="text-xs">Consulter</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                      <SidebarMenuSubButton asChild>
                                        <NavLink 
                                          to={getDrawPath(drawName, "stats")} 
                                          className={getNavCls}
                                        >
                                          <BarChart3 className="h-3 w-3" />
                                          <span className="text-xs">Statistiques</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                      <SidebarMenuSubButton asChild>
                                        <NavLink 
                                          to={getDrawPath(drawName, "prediction")} 
                                          className={getNavCls}
                                        >
                                          <Brain className="h-3 w-3" />
                                          <span className="text-xs">Prédiction</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                      <SidebarMenuSubButton asChild>
                                        <NavLink 
                                          to={getDrawPath(drawName, "history")} 
                                          className={getNavCls}
                                        >
                                          <Calendar className="h-3 w-3" />
                                          <span className="text-xs">Historique</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Menu réduit pour mode collapsed */}
        {collapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Object.entries(DRAW_SCHEDULE).map(([day, draws]) => {
                  const DayIcon = getDayIcon(day);
                  const isToday = day === currentDay;
                  
                  return (
                    <SidebarMenuItem key={day}>
                      <SidebarMenuButton 
                        className={`relative ${isToday ? 'bg-sidebar-accent' : ''}`}
                        title={`${day} - ${Object.keys(draws).length} tirages`}
                      >
                        <DayIcon className="h-4 w-4" />
                        {isToday && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-sidebar-primary rounded-full"></div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={() => navigate("/admin")}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>Paramètres</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}