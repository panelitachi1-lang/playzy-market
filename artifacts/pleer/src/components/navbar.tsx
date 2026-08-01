import { Link, useLocation } from "wouter"
import { Search, PlusCircle, User, MessageSquare, Menu, Send, Wallet, Shield } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useUser, useClerk } from "@clerk/react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"

export function Navbar() {
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const [search, setSearch] = useState("")
  const [, setLocation] = useLocation()

  const { data: me } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch("/api/users/me"),
    enabled: !!isSignedIn,
    staleTime: 30_000,
  })

  const { data: unreadCount } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => apiFetch("/api/conversations/unread-count"),
    enabled: !!isSignedIn,
    refetchInterval: 10_000,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      setLocation(`/listings?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto max-w-7xl flex h-16 items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 font-black text-2xl text-primary tracking-tighter shrink-0 mr-4 group">
          <img
            src="/logo.svg"
            alt="Playzy"
            className="h-9 w-auto group-hover:scale-105 transition-transform"
          />
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex items-center">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="Алмазы Free Fire, Telegram Stars, аккаунты..."
              className="w-full pl-10 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 rounded-xl h-10 font-bold transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Telegram support */}
          <a
            href="https://t.me/PlayzySupport"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-bold text-[#2AABEE] bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 border border-[#2AABEE]/20 transition-all"
            title="Поддержка в Telegram"
          >
            <Send className="h-4 w-4 fill-[#2AABEE]/20" />
            <span className="hidden md:inline">Поддержка</span>
          </a>

          <Button asChild variant="default" className="hidden sm:flex font-black rounded-xl shadow-sm hover:shadow-md h-10 px-4 btn-sell-glow" size="sm">
            <Link href="/listings/new">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Продать
            </Link>
          </Button>

          {isSignedIn ? (
            <div className="flex items-center gap-1">
              {me?.isAdmin && (
                <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary" title="Панель администратора">
                  <Link href="/admin">
                    <Shield className="h-5 w-5 text-primary" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm" className="rounded-xl hover:bg-primary/10 hover:text-primary hidden sm:flex gap-1.5 font-bold px-3" title="Кошелёк">
                <Link href="/wallet">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs">{me ? `${(me.balance / 100).toFixed(2)} ₽` : "—"}</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary">
                <Link href="/messages">
                  <span className="relative inline-flex">
                    <MessageSquare className="h-5 w-5" />
                    {(unreadCount?.count ?? 0) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow pointer-events-none">
                        {unreadCount!.count > 9 ? "9+" : unreadCount!.count}
                      </span>
                    )}
                  </span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary">
                <Link href="/my/listings">
                  <Menu className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-colors ml-1">
                <Link href="/settings">
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex font-bold rounded-xl h-10 px-4">
                <Link href="/sign-in">Войти</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
