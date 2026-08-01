import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@clerk/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Star, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Review {
  id: number
  reviewerId: string
  reviewedUserId: string
  conversationId: number
  rating: number
  comment: string | null
  dealStatus: string
  createdAt: string
  reviewerName: string
  reviewerAvatarUrl: string | null
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-6 w-6 transition-colors ${s <= value ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"} ${onChange ? "cursor-pointer hover:text-yellow-400" : ""}`}
          onClick={() => onChange?.(s)}
        />
      ))}
    </div>
  )
}

export function UserReviews({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["reviews", userId],
    queryFn: () => apiFetch(`/api/users/${userId}/reviews`),
    enabled: !!userId,
  })

  if (!data?.reviews?.length) {
    return <p className="text-sm text-muted-foreground py-4">Отзывов пока нет</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        {data.averageRating && (
          <>
            <StarRating value={Math.round(data.averageRating)} />
            <span className="text-2xl font-black">{data.averageRating}</span>
            <span className="text-sm text-muted-foreground">({data.total} отзывов)</span>
          </>
        )}
      </div>
      {data.reviews.map((r: Review) => (
        <Card key={r.id}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              {r.reviewerAvatarUrl ? (
                <img src={r.reviewerAvatarUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {r.reviewerName[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{r.reviewerName}</span>
                  <StarRating value={r.rating} />
                  <span className={`text-xs font-medium flex items-center gap-1 ${r.dealStatus === "success" ? "text-green-600" : "text-red-600"}`}>
                    {r.dealStatus === "success" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                    {r.dealStatus === "success" ? "Успешная сделка" : "Неудачная сделка"}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleDateString("ru")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function LeaveReviewForm({ conversationId, onDone }: { conversationId: number; onDone?: () => void }) {
  const { isSignedIn } = useUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [dealStatus, setDealStatus] = useState<"success" | "fail" | "">("")

  const mutation = useMutation({
    mutationFn: () => {
      if (!rating) throw new Error("Поставьте оценку")
      if (!dealStatus) throw new Error("Укажите исход сделки")
      return apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ conversationId, rating, comment: comment.trim() || undefined, dealStatus }),
      })
    },
    onSuccess: () => {
      toast({ title: "Отзыв оставлен!" })
      qc.invalidateQueries({ queryKey: ["reviews"] })
      onDone?.()
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  if (!isSignedIn) return null

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Оценка</p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="flex gap-3">
        <Button
          size="sm"
          variant={dealStatus === "success" ? "default" : "outline"}
          className={`gap-1.5 ${dealStatus === "success" ? "bg-green-600 hover:bg-green-700" : "text-green-600 border-green-300"}`}
          onClick={() => setDealStatus("success")}
        >
          <ThumbsUp className="h-4 w-4" /> Успешная
        </Button>
        <Button
          size="sm"
          variant={dealStatus === "fail" ? "destructive" : "outline"}
          className={`gap-1.5 ${dealStatus !== "fail" ? "text-red-600 border-red-300" : ""}`}
          onClick={() => setDealStatus("fail")}
        >
          <ThumbsDown className="h-4 w-4" /> Неудачная
        </Button>
      </div>

      <Textarea
        placeholder="Комментарий (необязательно)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />

      <Button
        className="w-full font-bold"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !rating || !dealStatus}
      >
        {mutation.isPending ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Отправка...</> : "Оставить отзыв"}
      </Button>
    </div>
  )
}
