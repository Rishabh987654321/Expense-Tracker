import { cn } from "@/lib/utils";

export default function Footer({ className }) {
  return (
    <footer className={cn("border-t py-8 text-center text-xs text-muted-foreground", className)}>
      Made with 💖 by Rishabh Rai
    </footer>
  );
}

