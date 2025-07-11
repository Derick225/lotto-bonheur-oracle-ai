import { cn } from "@/lib/utils";

interface LotteryNumberProps {
  number: number;
  className?: string;
  isWinning?: boolean;
}

export function LotteryNumber({ number, className, isWinning = false }: LotteryNumberProps) {
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

  return (
    <div
      className={cn(
        "lottery-number",
        getNumberClass(number),
        isWinning && "ring-2 ring-accent animate-pulse",
        className
      )}
    >
      {number}
    </div>
  );
}