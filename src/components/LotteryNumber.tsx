import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const lotteryNumberVariants = cva(
  "lottery-number",
  {
    variants: {
      size: {
        xs: "w-6 h-6 text-xs",
        sm: "w-8 h-8 text-sm",
        md: "w-12 h-12 text-base",
        lg: "w-16 h-16 text-lg",
        xl: "w-20 h-20 text-xl"
      },
      variant: {
        default: "",
        winning: "ring-2 ring-accent animate-pulse",
        predicted: "ring-2 ring-primary shadow-lg",
        frequent: "ring-2 ring-green-500",
        rare: "ring-2 ring-orange-500"
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default"
    }
  }
);

interface LotteryNumberProps extends VariantProps<typeof lotteryNumberVariants> {
  number: number;
  className?: string;
  isWinning?: boolean;
  isPredicted?: boolean;
  frequency?: 'frequent' | 'rare' | 'normal';
  onClick?: () => void;
  tooltip?: string;
}

export function LotteryNumber({
  number,
  className,
  size,
  isWinning = false,
  isPredicted = false,
  frequency = 'normal',
  onClick,
  tooltip
}: LotteryNumberProps) {

  const getNumberClass = (num: number) => {
    if (num >= 1 && num <= 9) return "lottery-number-1-9";
    if (num >= 10 && num <= 19) return "lottery-number-10-19";
    if (num >= 20 && num <= 29) return "lottery-number-20-29";
    if (num >= 30 && num <= 39) return "lottery-number-30-39";
    if (num >= 40 && num <= 49) return "lottery-number-40-49";
    if (num >= 50 && num <= 59) return "lottery-number-50-59";
    if (num >= 60 && num <= 69) return "lottery-number-60-69";
    if (num >= 70 && num <= 79) return "lottery-number-70-79";
    if (num >= 80 && num <= 90) return "lottery-number-80-90";
    return "lottery-number-1-9";
  };

  const getColorName = (num: number) => {
    if (num >= 1 && num <= 9) return "Blanc";
    if (num >= 10 && num <= 19) return "Bleu";
    if (num >= 20 && num <= 29) return "Orange";
    if (num >= 30 && num <= 39) return "Vert";
    if (num >= 40 && num <= 49) return "Jaune";
    if (num >= 50 && num <= 59) return "Rose";
    if (num >= 60 && num <= 69) return "Indigo";
    if (num >= 70 && num <= 79) return "Brun";
    if (num >= 80 && num <= 90) return "Rouge";
    return "Blanc";
  };

  const getVariant = () => {
    if (isWinning) return "winning";
    if (isPredicted) return "predicted";
    if (frequency === 'frequent') return "frequent";
    if (frequency === 'rare') return "rare";
    return "default";
  };

  const numberElement = (
    <div
      className={cn(
        lotteryNumberVariants({ size, variant: getVariant() }),
        getNumberClass(number),
        onClick && "cursor-pointer hover:scale-110 transition-transform",
        className
      )}
      onClick={onClick}
      title={tooltip || `Numéro ${number} (${getColorName(number)})`}
    >
      {number}
    </div>
  );

  return numberElement;
}

// Composant pour afficher la légende des couleurs
export function ColorLegend({ className }: { className?: string }) {
  const colorRanges = [
    { range: "1-9", color: "Blanc", class: "lottery-number-1-9" },
    { range: "10-19", color: "Bleu", class: "lottery-number-10-19" },
    { range: "20-29", color: "Orange", class: "lottery-number-20-29" },
    { range: "30-39", color: "Vert", class: "lottery-number-30-39" },
    { range: "40-49", color: "Jaune", class: "lottery-number-40-49" },
    { range: "50-59", color: "Rose", class: "lottery-number-50-59" },
    { range: "60-69", color: "Indigo", class: "lottery-number-60-69" },
    { range: "70-79", color: "Brun", class: "lottery-number-70-79" },
    { range: "80-90", color: "Rouge", class: "lottery-number-80-90" }
  ];

  return (
    <div className={cn("grid grid-cols-3 md:grid-cols-9 gap-2", className)}>
      {colorRanges.map((item) => (
        <div key={item.range} className="text-center">
          <div className={cn("lottery-number w-8 h-8 text-xs mx-auto mb-1", item.class)}>
            {item.range.split('-')[0]}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.range}
          </div>
          <div className="text-xs font-medium">
            {item.color}
          </div>
        </div>
      ))}
    </div>
  );
}