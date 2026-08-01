import { useGetListings, useGetCategories, GetListingsType } from "@workspace/api-client-react"
import { ListingCard } from "@/components/listing-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocation, useSearch } from "wouter"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gamepad2, FilterX, PackageSearch, Pin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getGameColor, getGameImage, ALL_GAMES, GAME_COLORS } from "@/lib/constants"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState, useEffect } from "react"

export function Listings() {
  const [, setLocation] = useLocation()

  const search = useSearch()
  const params = new URLSearchParams(search)
  const currentType = (params.get("type") as GetListingsType) || "all"
  const currentCategory = params.get("category") || ""
  const initialSearch = params.get("q") || ""
  const [searchInput, setSearchInput] = useState(initialSearch)

  useEffect(() => { setSearchInput(initialSearch) }, [initialSearch])

  const { data: categories } = useGetCategories()
  const { data: listingsPage, isLoading } = useGetListings({
    type: currentType !== "all" ? currentType : undefined,
    category: currentCategory || undefined,
    q: initialSearch || undefined,
    limit: 50
  })

  const updateFilters = (key: string, value: string) => {
    const p = new URLSearchParams(window.location.search)
    if (value && value !== "all") { p.set(key, value) } else { p.delete(key) }
    const qs = p.toString()
    setLocation(qs ? `/listings?${qs}` : "/listings")
  }

  const handleClearFilters = () => setLocation("/listings")
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); updateFilters("q", searchInput.trim()) }
  const categoryColor = getGameColor(currentCategory)
  const categoryCountMap = new Map<string, number>((categories || []).map(c => [c.name, c.count]))
  const extraFromApi = (categories || []).map(c => c.name).filter(n => !GAME_COLORS[n])
  const allSidebarGames = [...ALL_GAMES, ...extraFromApi].map(name => ({ name, count: categoryCountMap.get(name) || 0 }))
  const pinnedItems = (listingsPage?.items || []).filter((l: any) => l.isPinned)
  const regularItems = (listingsPage?.items || []).filter((l: any) => !l.isPinned)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-border pb-6">
        <div>
          {currentCategory ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-8 rounded-full shadow-sm" style={{ backgroundColor: categoryColor }} />
              <h1 className="text-3xl font-black tracking-tight">{currentCategory}</h1>
            </div>
          ) : <h1 className="text-3xl font-black tracking-tight">Каталог товаров</h1>}
          {initialSearch && <p className="text-muted-foreground mt-2 font-medium">Поиск: <strong>"{initialSearch}"</strong></p>}
        </div>
        <Tabs value={currentType} onValueChange={(val) => updateFilters("type", val)}>
          <TabsList className="grid w-[300px] grid-cols-3 h-10 p-1 bg-muted/50 border border-border">
            <TabsTrigger value="all" className="font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Все</TabsTrigger>
            <TabsTrigger value="sell" className="font-bold text-indigo-600 data-[state=active]:bg-background data-[state=active]:shadow-sm">ПРОДАЖА</TabsTrigger>
            <TabsTrigger value="buy" className="font-bold text-green-600 data-[state=active]:bg-background data-[state=active]:shadow-sm">ПОКУПКА</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-6">
          <form onSubmit={handleSearch} className="relative shadow-sm rounded-xl">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Поиск по названию..." className="pl-10 h-10 bg-card border-border" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </form>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <span className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" /> Все игры
              </span>
              {(currentCategory || initialSearch || currentType !== "all") && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleClearFilters}>
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="px-2 pt-2">
              <button onClick={() => updateFilters("category", "")} className={`w-full flex items-center justify-between text-sm py-2 px-3 rounded-lg transition-colors ${!currentCategory ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted font-medium"}`}>
                Все игры
                <span className="text-xs font-bold text-muted-foreground">{(categories || []).reduce((s, c) => s + c.count, 0)}</span>
              </button>
            </div>
            <ul className="max-h-[520px] overflow-y-auto px-2 pb-2 space-y-0.5 mt-1">
              {allSidebarGames.map(cat => {
                const color = getGameColor(cat.name)
                const isActive = currentCategory === cat.name
                return (
                  <li key={cat.name}>
                    <button
                      onClick={() => updateFilters("category", cat.name)}
                      className={`w-full flex items-center justify-between text-sm py-1.5 px-3 rounded-lg transition-all ${isActive ? "font-bold text-foreground" : "hover:bg-muted/60 font-medium text-muted-foreground hover:text-foreground"}`}
                      style={isActive ? { backgroundColor: `${color}18`, borderLeft: `3px solid ${color}` } : {}}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {getGameImage(cat.name) ? (
                          <img src={getGameImage(cat.name)!} alt={cat.name} className="w-6 h-6 rounded-md object-cover shrink-0 shadow-sm ring-1 ring-black/10" onError={e => { e.currentTarget.style.display = "none" }} />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                        )}
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className={`text-xs ml-2 font-bold tabular-nums shrink-0 ${cat.count === 0 ? "text-muted-foreground/50" : isActive ? "text-foreground" : "text-muted-foreground"}`}>{cat.count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <main>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <div key={i}><Skeleton className="h-[200px] w-full rounded-xl" /></div>)}
            </div>
          ) : (listingsPage?.items.length ?? 0) > 0 ? (
            <div className="space-y-6">
              {pinnedItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pin className="h-4 w-4 text-primary fill-primary" />
                    <span className="font-bold text-sm text-primary uppercase tracking-wide">Закреплённые</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {pinnedItems.map((listing: any) => (
                      <div key={listing.id} className="relative">
                        <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[11px] font-black px-1.5 py-0.5 rounded-full shadow">📌</div>
                        <ListingCard listing={listing} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {regularItems.length > 0 && (
                <div>
                  {pinnedItems.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Все объявления</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {regularItems.map((listing: any) => <ListingCard key={listing.id} listing={listing} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-xl border border-border shadow-sm flex flex-col items-center">
              {currentCategory ? (
                <>
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 text-4xl font-black text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${categoryColor} 0%, #111 160%)` }}>
                    {currentCategory.charAt(0)}
                  </div>
                  <p className="text-xl font-black text-foreground mb-2">Нет объявлений в «{currentCategory}»</p>
                  <p className="text-muted-foreground mb-6 font-medium max-w-xs">Пока никто не разместил объявление по этой игре. Будь первым!</p>
                  <div className="flex gap-3">
                    <Button onClick={handleClearFilters} variant="outline" className="font-bold border-2">Смотреть все игры</Button>
                    <Button asChild className="font-bold"><a href="/listings/new"><PackageSearch className="mr-2 h-4 w-4" />Создать объявление</a></Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4"><Search className="w-8 h-8 text-muted-foreground" /></div>
                  <p className="text-xl font-bold text-foreground mb-2">Ничего не найдено</p>
                  <p className="text-muted-foreground mb-6 font-medium">Попробуйте изменить фильтры или поисковый запрос.</p>
                  <div className="flex gap-3">
                    <Button onClick={handleClearFilters} variant="outline" className="font-bold border-2">Сбросить фильтры</Button>
                    <Button asChild className="font-bold"><a href="/listings/new"><PackageSearch className="mr-2 h-4 w-4" />Создать объявление</a></Button>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
