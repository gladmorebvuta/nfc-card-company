import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-primary/70 text-primary-foreground hover:bg-primary/60 backdrop-blur-lg border border-primary/30 shadow-lg shadow-primary/20 dark:shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 dark:hover:shadow-primary/20",
        destructive:
          "bg-destructive/70 text-white hover:bg-destructive/60 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 backdrop-blur-lg border border-destructive/30 shadow-lg shadow-destructive/20 hover:shadow-xl hover:shadow-destructive/25",
        outline:
          "border border-border/60 bg-background/40 dark:bg-background/60 text-foreground hover:bg-background/30 dark:hover:bg-background/50 hover:text-foreground backdrop-blur-xl shadow-lg shadow-black/10 dark:shadow-black/20 hover:shadow-xl hover:border-border/80",
        secondary:
          "bg-secondary/60 text-secondary-foreground hover:bg-secondary/50 backdrop-blur-lg border border-secondary/40 shadow-lg shadow-secondary/15 hover:shadow-xl hover:shadow-secondary/25",
        ghost:
          "hover:bg-background/30 dark:hover:bg-background/40 hover:text-foreground backdrop-blur-sm hover:backdrop-blur-lg hover:border hover:border-border/40 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
