import { useGetTrendingListings } from "@workspace/api-client-react"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, useLocation } from "wouter"
import { Skeleton } from "@/components/ui/skeleton"
import { Flame, Search, ChevronRight, Gamepad2, TrendingDown, TrendingUp, Users } from "lucide-react"
import { getGameColor, getGameImage, ALL_GAMES } from "@/lib/constants"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import type { DashboardStats } from "@workspace/api-client-react"

export function Home() {
  const { data: trending, isLoading: isLoadingTrending } = useGetTrendingListings({ limit: 8 })
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch("/api/stats/dashboard"),
    staleTime: 60_000,
  })
  const [, setLocation] = useLocation()
  const [search, setSearch] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      setLocation(`/listings?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <div className="flex-1 w-full bg-muted/30 pb-16">
      {/* Hero Section */}
      <section className="bg-card border-b py-16 px-4 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10 flex flex-col items-center text-center space-y-8">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-4 py-1.5 text-sm font-bold rounded-full">
            <Users className="h-3.5 w-3.5 mr-1.5 inline-block" />
            С нами уже {stats?.totalUsers != null ? stats.totalUsers.toLocaleString("ru-RU") : "…"} человек
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] max-w-3xl">
            Купи алмазы, звёзды, аккаунты — <span className="text-primary">моментально</span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-muted-foreground max-w-2xl">
            Безопасная биржа игровых ценностей. Тысячи предложений от реальных игроков.
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-2xl relative mt-4 shadow-xl shadow-primary/5 rounded-2xl">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <Input
              type="search"
              placeholder="Алмазы Free Fire, Telegram Stars, аккаунты Roblox..."
              className="w-full pl-14 pr-32 h-16 text-lg bg-background border-2 border-primary/20 focus-visible:border-primary rounded-2xl focus-visible:ring-0 shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="absolute inset-y-2 right-2 flex items-center">
              <Button type="submit" size="lg" className="h-full rounded-xl px-8 font-bold text-base btn-primary-shimmer">
                Найти
              </Button>
            </div>
          </form>

          {/* Buy / Sell CTA — plain buttons with useLocation (no nested <button> in <a>) */}
          <div className="flex items-center gap-4 pt-2 flex-wrap justify-center">
            <button
              onClick={() => setLocation("/listings?type=sell")}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-base bg-primary text-primary-foreground shadow-lg shadow-primary/25 btn-sell-glow"
            >
              <TrendingDown className="h-5 w-5" />
              Покупаю
            </button>
            <button
              onClick={() => setLocation("/listings?type=buy")}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-base bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 btn-buy-glow"
            >
              <TrendingUp className="h-5 w-5" />
              Продаю
            </button>
            <a
              href="https://t.me/PlayzySupport"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-base text-[#2AABEE] bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 border border-[#2AABEE]/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#2AABEE]" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Поддержка
            </a>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 space-y-12">
        {/* ALL Games Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              Все игры
            </h2>
            <Button variant="ghost" asChild className="hidden sm:flex font-bold">
              <Link href="/listings">Каталог <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ALL_GAMES.map(gameName => {
              const color = getGameColor(gameName)
              const img = getGameImage(gameName)
              return (
                <div
                  key={gameName}
                  onClick={() => setLocation(`/listings?category=${encodeURIComponent(gameName)}`)}
                  className="group relative h-20 rounded-xl overflow-hidden flex flex-col justify-end cursor-pointer shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 hover:scale-[1.04]"
                  style={{ border: `1px solid ${color}30` }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={gameName}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      onError={e => { e.currentTarget.style.display = "none" }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${color} 0%, #111 160%)` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/70 transition-all pointer-events-none" />
                  <div className="relative z-10 p-2.5 pb-2 pointer-events-none">
                    <div className="font-bold text-xs leading-tight text-white drop-shadow line-clamp-2">{gameName}</div>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 h-0.5 w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left pointer-events-none"
                    style={{ backgroundColor: color }}
                  />
                </div>
              )
            })}
          </div>
        </section>

        {/* Trending Listings */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Flame className="w-6 h-6 text-primary fill-primary/20" />
              Горячие предложения
            </h2>
          </div>

          {isLoadingTrending ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : trending?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trending.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border shadow-sm flex flex-col items-center gap-4">
              <p className="text-muted-foreground font-medium">Пока нет предложений.</p>
              <Button asChild className="font-bold btn-sell-glow btn-primary-shimmer">
                <Link href="/listings/new">Создать первое объявление</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
