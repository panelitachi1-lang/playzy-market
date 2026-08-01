import { useGetConversations, getGetConversationsQueryKey } from "@workspace/api-client-react"
import { Link } from "wouter"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

export function Messages() {
  // Polling every 5 seconds
  const { data: conversations, isLoading } = useGetConversations({
    query: { queryKey: getGetConversationsQueryKey(), refetchInterval: 5000 }
  })

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-black mb-8 border-b pb-4">Сообщения</h1>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (conversations?.filter((c: any) => c.lastMessage)?.length) ? (
        <div className="bg-card border rounded-xl overflow-hidden divide-y">
          {conversations.filter((c: any) => c.lastMessage).map(conv => (
            <Link key={conv.id} href={`/messages/${conv.id}`}>
              <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={conv.otherUserAvatarUrl || undefined} />
                  <AvatarFallback>{conv.otherUserName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-base truncate group-hover:text-primary transition-colors">
                      {conv.otherUserName || "Пользователь"}
                    </h4>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: ru })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {conv.listingTitle && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full border shrink-0 max-w-[120px] truncate">
                        {conv.listingTitle}
                      </span>
                    )}
                    <p className={`text-sm truncate ${conv.unreadCount ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {conv.lastMessage || "Сообщений пока нет"}
                    </p>
                  </div>
                </div>

                {conv.unreadCount ? (
                  <div className="bg-primary text-primary-foreground text-xs font-bold h-6 min-w-6 px-2 rounded-full flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
          <p className="text-muted-foreground">У вас пока нет диалогов.</p>
        </div>
      )}
    </div>
  )
}
