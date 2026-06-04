import * as React from "react"
import { cn } from "../../utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  indicatorClassName?: string;
}

export function ProgressBar({ className, value, indicatorClassName, ...props }: ProgressBarProps) {
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className={cn("h-full w-full flex-1 bg-[#3B82F6] transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
}