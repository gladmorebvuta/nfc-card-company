import { useTheme } from "./ThemeProvider";

interface BrandaptLogoProps {
  className?: string;
  variant?: "light" | "dark";
}

export function BrandaptLogo({ className, variant }: BrandaptLogoProps) {
  const { actualTheme } = useTheme();
  const resolvedVariant = variant || (actualTheme === "light" ? "dark" : "light");
  const logoSrc = resolvedVariant === "light" ? "/logo-light.png" : "/logo-dark.png";

  return (
    <div className={`flex items-center ${className ?? ""}`}>
      <img
        src={logoSrc}
        alt="Brandapt Logo"
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
