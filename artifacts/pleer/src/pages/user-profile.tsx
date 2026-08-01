import { useParams } from "wouter"
import { useGetUserProfile, useGetUserListings, getGetUserProfileQueryKey, getGetUserListingsQueryKey } from "@workspace/api-client-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Calendar, Star, ShoppingBag, MessageSquare } from "lucide-react"
import { ListingCard } from "@/components/listing-card"
import { UserReviews } from "@/pages/reviews"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

export function UserProfile() {
  const { userId } = useParams()
  
  const { data: profile, isLoading: isLoadingProfile } = useGetUserProfile(userId || "", {
    query: { enabled: !!userId, queryKey: getGetUserProfileQueryKey(userId || "") }
  })
  
  const { data: listings, isLoading: isLoadingListings } = useGetUserListings(userId || "", {
    query: { enabled: !!userId, queryKey: getGetUserListingsQueryKey(userId || "") }
  })

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex gap-8 mb-12">
          <Skeleton className="h-32 w-32 rounded-full shrink-0" />
          <div className="space-y-4 flex-1">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-20 w-full max-w-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-20">Пользователь не найден</div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 space-y-12">
      {/* Profile Header */}
      <div className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start">
        <Avatar className="h-32 w-32 border-4 border-background shadow-md">
          <AvatarImage src={profile.avatarUrl || undefined} />
          <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
            {profile.displayName?.charAt(0) || profile.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-black">{profile.displayName || profile.username}</h1>
            <p className="text-muted-foreground font-medium mt-1">@{profile.username}</p>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            {profile.city && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full border">
                <MapPin className="h-4 w-4 text-primary" />
                {profile.city}
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full border">
              <Calendar className="h-4 w-4 text-primary" />
              На сайте с {format(new Date(profile.createdAt), "MMMM yyyy", { locale: ru })}
            </div>
            {profile.rating !== null && profile.rating !== undefined && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full border text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                {profile.rating.toFixed(1)} Рейтинг
              </div>
            )}
          </div>
          
          <div className="prose prose-sm max-w-3xl text-foreground">
            {profile.bio || <span className="text-muted-foreground italic">Нет информации о пользователе.</span>}
          </div>
          
          <div className="flex gap-8 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-black">{profile.totalSales}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Продаж</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">{profile.totalPurchases}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Покупок</p>
            </div>
          </div>
        </div>
      </div>

      {/* User's Listings */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Активные объявления
        </h2>
        
        {isLoadingListings ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : listings?.filter(l => l.status === "active").length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.filter(l => l.status === "active").map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground">У этого пользователя нет активных объявлений.</p>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Отзывы
        </h2>
        <UserReviews userId={userId || ""} />
      </div>
    </div>
  )
}
