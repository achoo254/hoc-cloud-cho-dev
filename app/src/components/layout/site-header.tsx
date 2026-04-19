import { Link } from 'react-router-dom'
import { Moon, Sun, Search, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg mr-6">
          <Cloud className="h-5 w-5 text-primary" />
          <span>Hoc Cloud</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-4 text-sm flex-1">
          <Link
            to="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Labs
          </Link>
          <Link
            to="/search"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Search
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger placeholder — phase 02 will wire up cmdk */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-muted-foreground w-40 justify-start"
            asChild
          >
            <Link to="/search">
              <Search className="h-4 w-4" />
              <span>Search labs...</span>
              <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                ⌘K
              </kbd>
            </Link>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
