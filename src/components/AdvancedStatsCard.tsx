import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface AdvancedStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  progress?: number;
  progressLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
  animated?: boolean;
  children?: React.ReactNode;
}

export function AdvancedStatsCard({
  title,
  value,
  description,
  icon: Icon = Activity,
  trend,
  trendLabel,
  progress,
  progressLabel,
  variant = 'default',
  className = '',
  animated = true,
  children
}: AdvancedStatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    if (animated && typeof value === 'number') {
      const duration = 1000; // 1 seconde
      const steps = 50;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [value, animated]);

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend > 0) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (trend < 0) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    } else {
      return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    return trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground';
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary/20 bg-primary/5 hover:bg-primary/10';
      case 'success':
        return 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10';
      case 'destructive':
        return 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10';
      default:
        return 'gradient-card';
    }
  };

  return (
    <Card 
      className={`
        ${getVariantClasses()} 
        transition-all duration-300 hover:scale-105 hover:shadow-lg
        ${animated ? 'animate-fade-in' : ''}
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-2xl font-bold animate-scale-in">
            {animated && typeof value === 'number' ? displayValue.toLocaleString() : value}
          </div>
          
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
          
          {trendLabel && (
            <Badge variant="outline" className="text-xs">
              {trendLabel}
            </Badge>
          )}
        </div>

        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {progressLabel || 'Progression'}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2 animate-scale-in"
              style={{
                animationDelay: animated ? '0.3s' : '0s'
              }}
            />
          </div>
        )}

        {children && (
          <div className="pt-2 border-t border-border/50">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Variantes prédéfinies
export function PrimaryStatsCard(props: Omit<AdvancedStatsCardProps, 'variant'>) {
  return <AdvancedStatsCard {...props} variant="primary" />;
}

export function SuccessStatsCard(props: Omit<AdvancedStatsCardProps, 'variant'>) {
  return <AdvancedStatsCard {...props} variant="success" />;
}

export function WarningStatsCard(props: Omit<AdvancedStatsCardProps, 'variant'>) {
  return <AdvancedStatsCard {...props} variant="warning" />;
}

export function DestructiveStatsCard(props: Omit<AdvancedStatsCardProps, 'variant'>) {
  return <AdvancedStatsCard {...props} variant="destructive" />;
}