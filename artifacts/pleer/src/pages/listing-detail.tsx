import { useState } from "react"
import { useParams, Link, useLocation } from "wouter"
import { useGetListing, getGetListingQueryKey, useCreateConversation } from "@workspace/api-client-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Gamepad2, ArrowLeft, Clock, ShieldCheck, ShoppingCart, Zap } from "lucide-react"
import { useUser } from "@clerk/react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { getGameColor } from "@/lib/constants"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"

export function ListingDetail() {
  const { id } = useParams()
  const { user } = useUser()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const [purchaseResult, setPurchaseResult] = useState<{secretData: string; secretType: string} | null>(null)

  const listingId = parseInt(id || "0", 10)
  const { data: listing, isLoading } = useGetListing(listingId, {
    query: { enabled: !!listingId, queryKey: getGetListingQueryKey(listingId) }
  })

  const createConversation = useCreateConversation()

  const buyNow = useMutation({
    mutationFn: () => apiFetch(`/api/listings/${listingId}/buy`, { method: "POST" }),
    onSuccess: (data) => {
      setPurchaseResult(data)
      queryClient.invalidateQueries({ queryKey: ["users", "me"] })
      toast({ title: "Покупка успешна!" })
    },
    onError: (e: any) => toast({ title: "шибка покупки", description: e.message, variant: "destructive" })
  })

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8">
          <Skeleton className="aspect-[3/2] w-full rounded-2xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-20 text-center">
        <h2 className="text-3xl font-black mb-4">бъявление не найдено</h2>
        <Button asChild size="lg" className="font-bold">
          <Link href="/listings">ернуться в каталог</Link>
        </Button>
      </div>
    )
  }

  const formattedPrice = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: listing.currency || "RUB",
    maximumFractionDigits: 0
  }).format(listing.price / 100)

  const isOwner = user?.id === listing.sellerId
  const gameColor = getGameColor(listing.category)

  const handleContactSeller = () => {
    if (!user) { setLocation("/sign-in"); return }
    createConversation.mutate(
      { data: { otherUserId: listing.sellerId, listingId: listing.id } },
      {
        onSuccess: (conv) => setLocation(`/messages/${conv.id}`),
        onError: () => toast({ title: "шибка", description: "е удалось начать чат.", variant: "destructive" })
      }
    )
  }

  const handleBuy = () => {
    if (!user) { setLocation("/sign-in"); return }
    if (confirm(`упить за ${formattedPrice}? еньги спишутся с вашего баланса.`)) {
      buyNow.mutate()
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Button variant="ghost" asChild className="mb-6 -ml-4 font-bold hover:bg-muted">
        <Link href="/listings"><ArrowLeft className="mr-2 h-5 w-5" /> Назад</Link>
      </Button>

      {listing.status === "pending" && isOwner && (
        <div className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 px-5 py-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-yellow-800">Объявление на проверке</p>
            <p className="text-sm text-yellow-700 mt-0.5">Ваше объявление ожидает проверки модератором. После одобрения оно появится в каталоге.</p>
          </div>
        </div>
      )}

      {listing.status === "rejected" && isOwner && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-800">бъявление отклонено</p>
            <p className="text-sm text-red-700 mt-0.5">
              Ваше объявление не прошло проверку модератора. Если вы считаете это ошибкой —{" "}
              <a href="https://t.me/PlayzySupport" target="_blank" rel="noopener noreferrer" className="underline font-semibold">обратитесь в поддержку</a>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-8 items-start">
        <div className="space-y-8">
          <div className="bg-card rounded-2xl overflow-hidden aspect-[3/2] flex items-center justify-center border border-border shadow-sm relative"
            style={{ background: listing.imageUrl ? "transparent" : `linear-gradient(135deg, ${gameColor} 0%, #111 150%)` }}>
            {listing.imageUrl ? (
              <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <>
                <span className="text-9xl font-black text-white mix-blend-overlay opacity-30 select-none">{(listing.category || "U").charAt(0).toUpperCase()}</span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white font-black text-4xl drop-shadow-md">{listing.category}</div>
              </>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="font-bold text-2xl mb-6">Описание</h3>
            <div className="prose prose-lg max-w-none text-foreground whitespace-pre-wrap leading-relaxed font-medium">
              {listing.description || <span className="text-muted-foreground italic">Продавец не оставил описание.</span>}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border">
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">ID объявления</p>
                <p className="font-bold font-mono text-lg">#{listing.id}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">Просмотров</p>
                <p className="font-bold font-mono text-lg">{listing.views || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 sticky top-24">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <Badge variant={listing.type === "buy" ? "secondary" : "default"}
                className={`mb-4 uppercase tracking-wider text-xs font-bold px-3 py-1 ${listing.type === "buy" ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}`}>
                {listing.type === "buy" ? "Щ" : ""}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-black leading-tight mb-4">{listing.title}</h1>
              <div className="text-4xl font-mono font-black text-primary bg-primary/5 p-4 rounded-xl inline-block border border-primary/10 shadow-inner">
                {formattedPrice}
              </div>
            </div>

            <div className="space-y-4 mb-8 bg-muted/50 p-5 rounded-xl border border-border/50">
              {listing.category && (
                <div className="flex items-center gap-4 text-base font-bold">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${gameColor}15`, color: gameColor, border: `1px solid ${gameColor}30` }}>
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Игра / Платформа</div>
                    <div>{listing.category}</div>
                  </div>
                </div>
              )}
              {listing.condition && (
                <div className="flex items-center gap-4 text-base font-bold">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 flex items-center justify-center shrink-0 shadow-sm">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Тип товара</div>
                    <div className="capitalize">{listing.condition}</div>
                  </div>
                </div>
              )}
              {listing.city && (
                <div className="flex items-center gap-4 text-base font-bold">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Способ передачи</div>
                    <div>{listing.city}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 text-base font-bold pt-2 border-t border-border/50">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Опубликовано</div>
                  <div>{formatDistanceToNow(new Date(listing.createdAt), { locale: ru, addSuffix: true })}</div>
                </div>
              </div>
            </div>

            {listing.status === "sold" ? (
              <Button disabled size="lg" className="w-full h-14 text-xl font-black bg-muted text-muted-foreground uppercase tracking-widest"></Button>
            ) : isOwner ? (
              <Button asChild size="lg" variant="outline" className="w-full h-14 text-lg font-bold border-2">
                <Link href="/my/listings">Управление объявлением</Link>
              </Button>
            ) : purchaseResult ? (
              <div className="space-y-3 p-4 rounded-xl border-2 border-green-300 bg-green-50">
                <p className="font-black text-green-800 flex items-center gap-2">Покупка успешна!</p>
                <p className="text-sm text-green-700 font-bold">Данные для входа:</p>
                {(() => {
                  try {
                    const d = JSON.parse(purchaseResult.secretData)
                    return (
                      <div className="space-y-2 bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground font-bold">ЛОГИН / EMAIL</span>
                          <span className="font-mono font-bold text-sm select-all">{d.login}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-xs text-muted-foreground font-bold">ПАРОЛЬ</span>
                          <span className="font-mono font-bold text-sm select-all">{d.password}</span>
                        </div>
                      </div>
                    )
                  } catch {
                    return <p className="font-mono text-sm">{purchaseResult.secretData}</p>
                  }
                })()}
                <p className="text-xs text-muted-foreground">Сохраните эти данные — они больше не будут показаны.</p>
                <Button size="lg" variant="outline" className="w-full h-12 text-base font-bold border-2 mt-2"
                  onClick={handleContactSeller} disabled={createConversation.isPending}>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Написать продавцу
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button size="lg" className="w-full h-14 text-lg font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 hover:scale-[1.02] transition-transform"
                  onClick={handleBuy} disabled={buyNow.isPending}>
                  <ShoppingCart className="mr-2 h-6 w-6" />
                  {buyNow.isPending ? "Покупка..." : `Купить за ${formattedPrice}`}
                </Button>
                <Button size="lg" variant="outline" className="w-full h-12 text-base font-bold border-2"
                  onClick={handleContactSeller} disabled={createConversation.isPending}>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  {createConversation.isPending ? "Создание чата..." : "Написать продавцу"}
                </Button>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-sm mb-4 text-muted-foreground uppercase tracking-wider"> продавце</h3>
            <Link href={`/profile/${listing.sellerId}`}>
              <div className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors">
                <Avatar className="h-16 w-16 border-2 border-border group-hover:border-primary transition-colors shadow-sm">
                  <AvatarImage src={listing.sellerAvatarUrl || undefined} />
                  <AvatarFallback className="text-xl font-black bg-primary/10 text-primary">{listing.sellerName?.charAt(0).toUpperCase() || ""}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-black text-xl group-hover:text-primary transition-colors leading-none mb-1.5">{listing.sellerName || listing.sellerId?.slice(-8) || "Анонимный игрок"}</p>
                  <p className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">Смотреть профиль &rarr;</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}