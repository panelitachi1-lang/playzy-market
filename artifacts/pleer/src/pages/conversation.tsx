import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "wouter"
import { 
  useGetMessages, 
  getGetMessagesQueryKey, 
  useSendMessage, 
  useMarkConversationRead,
  useGetConversations
} from "@workspace/api-client-react"
import { useUser } from "@clerk/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Send, ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle2, MessageSquare } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query"
import { format } from "date-fns"
import { apiFetch } from "@/lib/api"
import { LeaveReviewForm } from "@/pages/reviews"
import { useToast } from "@/hooks/use-toast"

export function Conversation() {
  const { conversationId } = useParams()
  const convId = parseInt(conversationId || "0", 10)
  const { user } = useUser()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState("")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // We need to fetch conversations to find details about this specific one
  const { data: conversations } = useGetConversations()
  const conversationDetails = conversations?.find(c => c.id === convId)

  // Fetch full conversation details including dealStatus
  const { data: convDetail, refetch: refetchDeal } = useQuery({
    queryKey: ["conversation-detail", convId],
    queryFn: () => apiFetch(`/api/conversations/${convId}`),
    enabled: !!convId,
    refetchInterval: 10000,
  })

  // Polling every 5 seconds
  const { data: messages, isLoading } = useGetMessages(convId, {
    query: { 
      enabled: !!convId, 
      refetchInterval: 2000,
      queryKey: getGetMessagesQueryKey(convId)
    }
  })

  const sendMessage = useSendMessage()
  const markRead = useMarkConversationRead()

  // Mark deal mutation
  const markDeal = useMutation({
    mutationFn: (status: "completed" | "failed") =>
      apiFetch(`/api/conversations/${convId}/deal`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast({ title: "Статус сделки обновлён" })
      refetchDeal()
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", convId] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  // Mark as read when messages load or change
  useEffect(() => {
    if (messages?.length && conversationDetails?.unreadCount) {
      markRead.mutate({ conversationId: convId })
    }
  }, [messages?.length, convId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    sendMessage.mutate({
      conversationId: convId,
      data: { text: text.trim() }
    }, {
      onSuccess: () => {
        setText("")
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey(convId) })
      }
    })
  }

  const dealStatus = convDetail?.dealStatus ?? null
  const isParticipant = convDetail
    ? (convDetail.buyerId === user?.id || convDetail.sellerId === user?.id)
    : false

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 h-[calc(100vh-64px)] flex flex-col">
        <Skeleton className="h-16 w-full rounded-xl mb-4" />
        <Skeleton className="flex-1 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4 h-[calc(100vh-64px)] flex flex-col gap-0">
      {/* Header */}
      <div className="bg-card border rounded-t-xl p-4 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 md:hidden">
            <Link href="/messages"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversationDetails?.otherUserAvatarUrl || undefined} />
            <AvatarFallback>{conversationDetails?.otherUserName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-base leading-tight">{conversationDetails?.otherUserName || "Пользователь"}</h2>
            {conversationDetails?.listingTitle && (
              <Link href={`/listings/${conversationDetails.listingId}`}>
                <p className="text-xs text-primary hover:underline line-clamp-1">{conversationDetails.listingTitle}</p>
              </Link>
            )}
          </div>
        </div>

        {/* Deal status badge */}
        {dealStatus && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
            dealStatus === "completed"
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-red-100 text-red-700 border border-red-200"
          }`}>
            {dealStatus === "completed"
              ? <><ThumbsUp className="h-3.5 w-3.5" /> Сделка успешна</>
              : <><ThumbsDown className="h-3.5 w-3.5" /> Сделка неудачна</>}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 bg-muted/10 border-x px-4 py-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages?.map((msg, i) => {
            const isMe = msg.senderId === user?.id
            const showTime = i === 0 || new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 5 * 60000

            return (
              <div key={msg.id} className="space-y-1">
                {showTime && (
                  <div className="text-center text-xs text-muted-foreground my-4">
                    {format(new Date(msg.createdAt), "d MMM, HH:mm")}
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-card border rounded-tl-sm text-card-foreground shadow-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {!messages?.length && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm py-20">
              Сообщений пока нет. Напишите первым!
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Deal + Review section */}
      {isParticipant && (
        <div className="bg-card border-x border-b-0 px-4 py-3 shrink-0 space-y-3">
          {!dealStatus ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Отметить сделку:</span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50 text-xs h-8"
                onClick={() => markDeal.mutate("completed")}
                disabled={markDeal.isPending}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> Успешная
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 text-xs h-8"
                onClick={() => markDeal.mutate("failed")}
                disabled={markDeal.isPending}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> Неудачная
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${dealStatus === "completed" ? "text-green-600" : "text-red-600"}`} />
              <span className="text-xs text-muted-foreground">
                Сделка отмечена как <strong>{dealStatus === "completed" ? "успешная" : "неудачная"}</strong>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-xs h-8 gap-1.5 text-primary"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {showReviewForm ? "Скрыть" : "Оставить отзыв"}
              </Button>
            </div>
          )}

          {showReviewForm && dealStatus && (
            <div className="pt-1 pb-2">
              <LeaveReviewForm
                conversationId={convId}
                onDone={() => setShowReviewForm(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="bg-card border rounded-b-xl p-4 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Input 
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Написать сообщение..." 
            className="flex-1 bg-muted/50 border-transparent focus-visible:bg-background"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!text.trim() || sendMessage.isPending} className="shrink-0 rounded-full h-10 w-10">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
