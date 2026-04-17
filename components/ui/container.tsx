import { cn } from "@/lib/utils"

export function Container({
  className,
  size = "default",
  children,
}: {
  className?: string
  size?: "default" | "narrow" | "wide"
  children: React.ReactNode
}) {
  const max =
    size === "narrow" ? "max-w-2xl" :
    size === "wide" ? "max-w-7xl" :
    "max-w-6xl"
  return (
    <div className={cn("w-full mx-auto px-4 sm:px-6 lg:px-8", max, className)}>
      {children}
    </div>
  )
}
