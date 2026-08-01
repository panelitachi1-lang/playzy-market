import { Link } from "wouter"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Listing } from "@workspace/api-client-react"
import { getGameColor } from "@/lib/constants"
import { User } from "lucide-react"

export function ListingCard({ listing }: { listing: Listing }) {
  const isBuy = listing.type === "buy"
  const formattedPrice = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: listing.currency || "RUB",
    maximumFractionDigits: 0
  }).format(listing.price / 100)

  const color = getGameColor(listing.category)

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group h-full flex flex-col bg-card border-border rounded-xl shadow-sm hover:shadow-md">
        <div
          className="h-28 relative overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${color} 0%, #111 150%)` }}
        >
          {listing.imageUrl && (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
            />
          )}
          {!listing.imageUrl && (
            <span className="text-6xl font-black text-white opacity-20 absolute -right-2 -bottom-4 rotate-12 scale-150 select-none">
              {(listing.category || "P").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="absolute top-2 left-2 flex gap-1 z-10">
            {isBuy ? (
              <Badge variant="secondary" className="bg-white text-black hover:bg-white/90 shadow-sm uppercase font-bold text-[10px] rounded-sm px-1.5 py-0">ИЩУ</Badge>
            ) : (
              <Badge variant="default" className="bg-black text-white hover:bg-black/90 shadow-sm uppercase font-bold text-[10px] rounded-sm px-1.5 py-0">ПРОДАЮ</Badge>
            )}
            {listing.status === "sold" && (
              <Badge variant="destructive" className="shadow-sm uppercase font-bold text-[10px] rounded-sm px-1.5 py-0">ПРОДАНО</Badge>
            )}
          </div>
          <div className="absolute top-2 right-2 z-10">
            <div className="px-2 py-0.5 rounded shadow-sm text-xs font-bold text-white border border-white/20 backdrop-blur-md bg-black/20">
              {listing.category || "Другое"}
            </div>
          </div>
        </div>

        <div className="p-3 flex flex-col flex-1 gap-2">
          <h3 className="font-medium text-sm line-clamp-2 leading-snug text-foreground/90 group-hover:text-primary transition-colors">{listing.title}</h3>
          <div className="mt-auto pt-2 flex items-end justify-between border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[50%]">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{listing.sellerName || "Анонимный игрок"}</span>
            </div>
            <div className="font-mono font-bold text-lg text-foreground tracking-tight whitespace-nowrap">
              {formattedPrice}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}