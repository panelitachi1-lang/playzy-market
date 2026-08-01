import { useState } from "react"
import { useGetMyListings, useUpdateListing, useDeleteListing, getGetMyListingsQueryKey } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "wouter"
import { ExternalLink, Trash2, CheckCircle2, Flame } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { PinListingModal } from "@/components/pin-listing-modal"

export function MyListings() {
  const { data: listings, isLoading } = useGetMyListings()
  const updateListing = useUpdateListing()
  const deleteListing = useDeleteListing()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [pinListingId, setPinListingId] = useState<number | null>(null)

  const handleMarkSold = (id: number) => {
    updateListing.mutate({
      id,
      data: { status: "sold" }
    }, {
      onSuccess: () => {
        toast({ title: "Объявление отмечено как продано" })
        queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() })
      }
    })
  }

  const handleMarkActive = (id: number) => {
    updateListing.mutate({
      id,
      data: { status: "active" }
    }, {
      onSuccess: () => {
        toast({ title: "Объявление снова активно" })
        queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() })
      }
    })
  }

  const handleDelete = (id: number) => {
    if (!window.confirm("Вы уверены, что хотите удалить это объявление?")) return
    
    deleteListing.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Объявление удалено" })
        queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() })
      }
    })
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <h1 className="text-3xl font-black">Мои объявления</h1>
        <Button asChild className="font-bold">
          <Link href="/listings/new">Разместить объявление</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : listings?.length ? (
        <div className="space-y-4">
          {listings.map(listing => (
            <Card key={listing.id} className={`overflow-hidden transition-all ${listing.status === 'sold' ? 'opacity-75 bg-muted/50' : ''}`}>
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-48 md:h-auto bg-muted shrink-0 relative">
                  {listing.imageUrl ? (
                    <img src={listing.imageUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Нет фото</div>
                  )}
                  {listing.status === "sold" && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Badge variant="outline" className="border-2 bg-background border-foreground text-foreground">ПРОДАНО</Badge>
                    </div>
                  )}
                </div>
                
                <CardContent className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant={listing.type === 'buy' ? 'secondary' : 'default'} className="mb-2">
                          {listing.type === 'buy' ? 'ИЩУ' : 'ПРОДАЮ'}
                        </Badge>
                        <h3 className="text-xl font-bold line-clamp-1">{listing.title}</h3>
                      </div>
                      <div className="text-xl font-black text-primary">
                        {listing.price} {listing.currency}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4 mt-2">
                      <span>{listing.views || 0} просмотров</span>
                      <span>{new Date(listing.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/listings/${listing.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" /> Открыть
                      </Link>
                    </Button>
                    
                    {listing.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                        onClick={() => setPinListingId(listing.id)}
                      >
                        <Flame className="w-4 h-4" /> Закрепить
                      </Button>
                    )}

                    {listing.status === "active" ? (
                      <Button variant="secondary" size="sm" onClick={() => handleMarkSold(listing.id)} disabled={updateListing.isPending}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Отметить как продано
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleMarkActive(listing.id)} disabled={updateListing.isPending}>
                        Сделать активным
                      </Button>
                    )}
                    
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(listing.id)} disabled={deleteListing.isPending}>
                      <Trash2 className="w-4 h-4 mr-2" /> Удалить
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
          <p className="text-muted-foreground mb-4">У вас пока нет объявлений.</p>
          <Button asChild className="font-bold"><Link href="/listings/new">Создать первое объявление</Link></Button>
        </div>
      )}

      {/* Pin Modal */}
      {pinListingId !== null && (
        <PinListingModal
          listingId={pinListingId}
          open={pinListingId !== null}
          onClose={() => setPinListingId(null)}
        />
      )}
    </div>
  )
}
