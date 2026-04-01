import Link from "next/link";
import { navItems } from "./nav-items";

export function DesktopNav() {
  return (
    <nav className="hidden lg:block items-center">
      <ul className="flex items-center space-x-6 text-sm font-medium">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
