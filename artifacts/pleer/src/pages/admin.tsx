import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@clerk/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Shield, Users, FileText, ArrowUpFromLine, Trash2,
  CheckCircle, XCircle, Loader2, Eye, Ban, UserCheck,
  BarChart3, ChevronLeft, ChevronRight
} from "lucide-react"
import { apiFetch } from "@/lib/api"

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">На проверке</Badge>
  if (status === "approved" || status === "completed") return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Выполнено</Badge>
  if (status === "processing") return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">В обработке</Badge>
  if (status === "active") return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Активно</Badge>
  if (status === "closed" || status === "sold") return <Badge variant="outline" className="text-gray-500 border-gray-200">Закрыто</Badge>
  if (status === "rejected") return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Отклонено</Badge>
  return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Отклонено</Badge>
}

function useAdminCheck() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => apiFetch("/api/users/me"),
    retry: false,
  })
}

export function AdminPage() {
  const { isSignedIn } = useUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data: me, isLoading: meLoading } = useAdminCheck()
  const [bootstrapSecret, setBootstrapSecret] = useState("")
  const [receiptFilter, setReceiptFilter] = useState("pending")
  const [withdrawFilter, setWithdrawFilter] = useState("pending")
  const [receiptPage, setReceiptPage] = useState(1)
  const [withdrawPage, setWithdrawPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const [listingPage, setListingPage] = useState(1)
  const [listingFilter, setListingFilter] = useState("pending")
  const [userSearch, setUserSearch] = useState("")
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const isAdmin = me?.isAdmin === true

  // Bootstrap mutation
  const bootstrapMutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/bootstrap", {
      method: "POST",
      body: JSON.stringify({ secret: bootstrapSecret }),
    }),
    onSuccess: () => {
      toast({ title: "✅ Вы теперь администратор!" })
      qc.invalidateQueries({ queryKey: ["admin", "me"] })
      qc.invalidateQueries({ queryKey: ["users", "me"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch("/api/admin/stats"),
    enabled: isAdmin,
    refetchInterval: 30000,
  })

  // Receipts
  const { data: receipts } = useQuery({
    queryKey: ["admin", "receipts", receiptFilter, receiptPage],
    queryFn: () => apiFetch(`/api/admin/receipts?status=${receiptFilter}&page=${receiptPage}`),
    enabled: isAdmin,
  })

  // Withdrawals
  const { data: withdrawals } = useQuery({
    queryKey: ["admin", "withdrawals", withdrawFilter, withdrawPage],
    queryFn: () => apiFetch(`/api/admin/withdrawals?status=${withdrawFilter}&page=${withdrawPage}`),
    enabled: isAdmin,
  })

  // Users
  const { data: users } = useQuery({
    queryKey: ["admin", "users", userPage, userSearch],
    queryFn: () => apiFetch(`/api/admin/users?page=${userPage}${userSearch ? `&q=${encodeURIComponent(userSearch)}` : ""}`),
    enabled: isAdmin,
  })

  // Listings
  const { data: listings } = useQuery({
    queryKey: ["admin", "listings", listingPage, listingFilter],
    queryFn: () => apiFetch(`/api/admin/listings?page=${listingPage}&status=${listingFilter}`),
    enabled: isAdmin,
  })

  const receiptAction = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: string; note?: string }) =>
      apiFetch(`/api/admin/receipts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote: note }),
      }),
    onSuccess: () => {
      toast({ title: "Готово" })
      qc.invalidateQueries({ queryKey: ["admin", "receipts"] })
      qc.invalidateQueries({ queryKey: ["admin", "stats"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  const withdrawalAction = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: string; note?: string }) =>
      apiFetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote: note }),
      }),
    onSuccess: () => {
      toast({ title: "Готово" })
      qc.invalidateQueries({ queryKey: ["admin", "withdrawals"] })
      qc.invalidateQueries({ queryKey: ["admin", "stats"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  const userAction = useMutation({
    mutationFn: ({ clerkId, action }: { clerkId: string; action: string }) =>
      apiFetch(`/api/admin/users/${clerkId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      toast({ title: "Готово" })
      qc.invalidateQueries({ queryKey: ["admin", "users"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  const deleteListing = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/listings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Объявление закрыто" })
      qc.invalidateQueries({ queryKey: ["admin", "listings"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  const moderateListing = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      apiFetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: (_data, vars) => {
      toast({ title: vars.action === "approve" ? "✅ Объявление опубликовано" : "❌ Объявление отклонено" })
      qc.invalidateQueries({ queryKey: ["admin", "listings"] })
      qc.invalidateQueries({ queryKey: ["admin", "stats"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  if (!isSignedIn) {
    return (
      <div className="container max-w-2xl mx-auto py-16 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Войдите для доступа к панели</p>
      </div>
    )
  }

  if (meLoading) {
    return <div className="container max-w-2xl mx-auto py-16 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="container max-w-md mx-auto py-16 space-y-6 px-4">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-black mb-2">Панель администратора</h1>
          <p className="text-muted-foreground text-sm">У вас нет доступа. Если вы владелец — введите секрет для первичной настройки.</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Input
              type="password"
              placeholder="Секретный ключ"
              value={bootstrapSecret}
              onChange={(e) => setBootstrapSecret(e.target.value)}
            />
            <Button
              className="w-full font-bold"
              onClick={() => bootstrapMutation.mutate()}
              disabled={bootstrapMutation.isPending || !bootstrapSecret}
            >
              {bootstrapMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Войти как администратор
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl"><Shield className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-black">Панель администратора</h1>
          <p className="text-sm text-muted-foreground">Управление Playzy</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Пользователи", value: stats.totalUsers, icon: Users },
            { label: "Объявления", value: stats.totalListings, icon: FileText },
            { label: "Чеки (в ожидании)", value: stats.pendingReceipts, icon: ArrowUpFromLine, highlight: stats.pendingReceipts > 0 },
            { label: "Выводы (в ожидании)", value: stats.pendingWithdrawals, icon: ArrowUpFromLine, highlight: stats.pendingWithdrawals > 0 },
            { label: "Объявлений на проверке", value: stats.pendingListings ?? 0, icon: FileText, highlight: (stats.pendingListings ?? 0) > 0 },
          ].map(({ label, value, icon: Icon, highlight }) => (
            <Card key={label} className={highlight ? "border-orange-300 bg-orange-50" : ""}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-black mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="receipts">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="receipts">Чеки</TabsTrigger>
          <TabsTrigger value="withdrawals">Выводы</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="listings">Объявления</TabsTrigger>
        </TabsList>

        {/* RECEIPTS */}
        <TabsContent value="receipts" className="space-y-4 mt-4">
          <div className="flex gap-2">
            {["pending", "approved", "rejected", "all"].map((s) => (
              <Button key={s} size="sm" variant={receiptFilter === s ? "default" : "outline"} onClick={() => { setReceiptFilter(s); setReceiptPage(1) }}>
                {s === "pending" ? "Ожидают" : s === "approved" ? "Одобрены" : s === "rejected" ? "Отклонены" : "Все"}
              </Button>
            ))}
          </div>

          {receipts?.items?.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">@{r.username} {r.displayName ? `· ${r.displayName}` : ""}</p>
                    <p className="text-2xl font-black text-primary">+{(r.amount / 100).toFixed(2)} ₽</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("ru")}</p>
                    {r.adminNote && <p className="text-sm text-muted-foreground mt-1">Примечание: {r.adminNote}</p>}
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewImage(r.receiptImageUrl)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" /> Чек
                </Button>

                {r.status === "pending" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Примечание (необязательно)"
                      value={rejectNote[r.id] ?? ""}
                      onChange={(e) => setRejectNote({ ...rejectNote, [r.id]: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-1.5"
                        onClick={() => receiptAction.mutate({ id: r.id, action: "approve", note: rejectNote[r.id] })}
                        disabled={receiptAction.isPending}
                      >
                        <CheckCircle className="h-4 w-4" /> Одобрить
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => receiptAction.mutate({ id: r.id, action: "reject", note: rejectNote[r.id] })}
                        disabled={receiptAction.isPending}
                      >
                        <XCircle className="h-4 w-4" /> Отклонить
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {receipts?.items?.length === 0 && <p className="text-muted-foreground text-sm">Нет записей</p>}

          {/* Pagination */}
          {receipts && receipts.total > 20 && (
            <div className="flex gap-2 items-center justify-center">
              <Button size="icon" variant="outline" onClick={() => setReceiptPage(p => Math.max(1, p - 1))} disabled={receiptPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">{receiptPage} / {Math.ceil(receipts.total / 20)}</span>
              <Button size="icon" variant="outline" onClick={() => setReceiptPage(p => p + 1)} disabled={receiptPage >= Math.ceil(receipts.total / 20)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>

        {/* WITHDRAWALS */}
        <TabsContent value="withdrawals" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            {["pending", "completed", "rejected", "all"].map((s) => (
              <Button key={s} size="sm" variant={withdrawFilter === s ? "default" : "outline"} onClick={() => { setWithdrawFilter(s); setWithdrawPage(1) }}>
                {s === "pending" ? "Ожидают" : s === "completed" ? "Выполнены" : s === "rejected" ? "Отклонены" : "Все"}
              </Button>
            ))}
          </div>

          {withdrawals?.items?.map((w: any) => (
            <Card key={w.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">@{w.username} {w.displayName ? `· ${w.displayName}` : ""}</p>
                    <p className="text-2xl font-black text-primary">{(w.amount / 100).toFixed(2)} ₽</p>
                    <p className="text-sm text-muted-foreground">
                      Получает: <strong>{(w.netAmount / 100).toFixed(2)} ₽</strong>
                      {" · "}Комиссия: {(w.fee / 100).toFixed(2)} ₽
                    </p>
                    <p className="font-mono text-sm mt-1">{w.cardBank} · {w.cardNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString("ru")}</p>
                    {w.adminNote && <p className="text-sm text-muted-foreground mt-1">Примечание: {w.adminNote}</p>}
                  </div>
                  <StatusBadge status={w.status} />
                </div>

                {(w.status === "pending" || w.status === "processing") && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Примечание (необязательно)"
                      value={rejectNote[w.id] ?? ""}
                      onChange={(e) => setRejectNote({ ...rejectNote, [w.id]: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-1.5"
                        onClick={() => withdrawalAction.mutate({ id: w.id, action: "complete", note: rejectNote[w.id] })}
                        disabled={withdrawalAction.isPending}
                      >
                        <CheckCircle className="h-4 w-4" /> Выплачено
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => withdrawalAction.mutate({ id: w.id, action: "reject", note: rejectNote[w.id] })}
                        disabled={withdrawalAction.isPending}
                      >
                        <XCircle className="h-4 w-4" /> Отклонить (вернуть)
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {withdrawals?.items?.length === 0 && <p className="text-muted-foreground text-sm">Нет записей</p>}

          {withdrawals && withdrawals.total > 20 && (
            <div className="flex gap-2 items-center justify-center">
              <Button size="icon" variant="outline" onClick={() => setWithdrawPage(p => Math.max(1, p - 1))} disabled={withdrawPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">{withdrawPage} / {Math.ceil(withdrawals.total / 20)}</span>
              <Button size="icon" variant="outline" onClick={() => setWithdrawPage(p => p + 1)} disabled={withdrawPage >= Math.ceil(withdrawals.total / 20)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <Input
            placeholder="Поиск по username или имени..."
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }}
          />
          {users?.items?.map((u: any) => (
            <Card key={u.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(u.username?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold">@{u.username}{u.isAdmin ? " 🛡️" : ""}</p>
                      {u.displayName && <p className="text-sm text-muted-foreground">{u.displayName}</p>}
                      <p className="text-xs text-muted-foreground">Баланс: {(u.balance / 100).toFixed(2)} ₽</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {u.isBanned ? (
                      <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-300" onClick={() => userAction.mutate({ clerkId: u.clerkId, action: "unban" })} disabled={userAction.isPending}>
                        <UserCheck className="h-3.5 w-3.5" /> Разбанить
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-300" onClick={() => userAction.mutate({ clerkId: u.clerkId, action: "ban" })} disabled={userAction.isPending}>
                        <Ban className="h-3.5 w-3.5" /> Забанить
                      </Button>
                    )}
                    {u.isAdmin ? (
                      <Button size="sm" variant="outline" className="gap-1.5 text-orange-600 border-orange-300" onClick={() => userAction.mutate({ clerkId: u.clerkId, action: "revoke_admin" })} disabled={userAction.isPending}>
                        <Shield className="h-3.5 w-3.5" /> Снять админа
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/40" onClick={() => userAction.mutate({ clerkId: u.clerkId, action: "grant_admin" })} disabled={userAction.isPending}>
                        <Shield className="h-3.5 w-3.5" /> Сделать админом
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {users?.items?.length === 0 && <p className="text-muted-foreground text-sm">Нет пользователей</p>}
          {users && users.total > 20 && (
            <div className="flex gap-2 items-center justify-center">
              <Button size="icon" variant="outline" onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">{userPage} / {Math.ceil(users.total / 20)}</span>
              <Button size="icon" variant="outline" onClick={() => setUserPage(p => p + 1)} disabled={userPage >= Math.ceil(users.total / 20)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>

        {/* LISTINGS */}
        <TabsContent value="listings" className="space-y-4 mt-4">
          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "pending", label: "На проверке" },
              { key: "active", label: "Активные" },
              { key: "rejected", label: "Отклонённые" },
              { key: "all", label: "Все" },
            ].map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={listingFilter === key ? "default" : "outline"}
                onClick={() => { setListingFilter(key); setListingPage(1) }}
              >
                {label}
              </Button>
            ))}
          </div>

          {listings?.items?.map((l: any) => (
            <Card key={l.id} className={l.status === "pending" ? "border-yellow-300 bg-yellow-50/30" : ""}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{l.title}</p>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {l.category && <span>{l.category} · </span>}
                      <span className="font-semibold">{(l.price / 100).toFixed(0)} ₽</span>
                      {l.type === "sell" ? " · Продаёт" : " · Ищет"}
                    </p>
                    {l.sellerName && (
                      <p className="text-xs text-muted-foreground">Продавец: @{l.sellerName}</p>
                    )}
                    {l.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>
                    )}
                    {l.imageUrl && (
                      <button
                        type="button"
                        className="mt-2 block"
                        onClick={() => setPreviewImage(l.imageUrl)}
                      >
                        <img src={l.imageUrl} alt="" className="h-20 rounded-lg object-cover border cursor-pointer hover:opacity-80 transition-opacity" />
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(l.createdAt).toLocaleString("ru")}</p>
                    {l.secretData && (() => { try { const d = JSON.parse(l.secretData); return <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs"><span className="font-bold text-blue-700">Данные: </span><span className="font-mono">{d.login} / {d.password}</span></div> } catch { return null } })()}
                  </div>
                </div>

                {/* Moderation buttons for pending */}
                {l.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 gap-1.5 font-bold"
                      onClick={() => moderateListing.mutate({ id: l.id, action: "approve" })}
                      disabled={moderateListing.isPending}
                    >
                      <CheckCircle className="h-4 w-4" /> Опубликовать
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5 font-bold"
                      onClick={() => moderateListing.mutate({ id: l.id, action: "reject" })}
                      disabled={moderateListing.isPending}
                    >
                      <XCircle className="h-4 w-4" /> Отклонить
                    </Button>
                  </div>
                )}

                {/* Delete button for active listings */}
                {l.status === "active" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => { if (confirm(`Закрыть объявление "${l.title}"?`)) deleteListing.mutate(l.id) }}
                      disabled={deleteListing.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Снять с публикации
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {listings?.items?.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">
              {listingFilter === "pending" ? "Нет объявлений на проверке 🎉" : "Нет объявлений"}
            </p>
          )}

          {listings && listings.total > 20 && (
            <div className="flex gap-2 items-center justify-center">
              <Button size="icon" variant="outline" onClick={() => setListingPage(p => Math.max(1, p - 1))} disabled={listingPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">{listingPage} / {Math.ceil(listings.total / 20)}</span>
              <Button size="icon" variant="outline" onClick={() => setListingPage(p => p + 1)} disabled={listingPage >= Math.ceil(listings.total / 20)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Чек"
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
