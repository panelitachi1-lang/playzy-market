import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@clerk/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle, Loader2, Upload, CreditCard, Info } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface BalanceInfo {
  balance: number
  balanceRub: string
  platformCards: { bank: string; number: string }[]
  withdrawalFeePercent: number
  minWithdrawalKopecks: number
}

interface Receipt {
  id: number
  amount: number
  status: string
  adminNote: string | null
  createdAt: string
}

interface Withdrawal {
  id: number
  amount: number
  fee: number
  netAmount: number
  cardNumber: string
  cardBank: string
  status: string
  adminNote: string | null
  createdAt: string
}

function statusBadge(status: string) {
  if (status === "pending") return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Ожидает</Badge>
  if (status === "approved" || status === "completed") return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Выполнено</Badge>
  if (status === "processing") return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Обработка</Badge>
  return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Отклонено</Badge>
}

export function WalletPage() {
  const { isSignedIn } = useUser()
  const { toast } = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [depositAmount, setDepositAmount] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardBank, setCardBank] = useState("")

  const { data: balance, isLoading } = useQuery<BalanceInfo>({
    queryKey: ["balance"],
    queryFn: () => apiFetch("/api/balance"),
    enabled: !!isSignedIn,
  })

  const { data: history } = useQuery<{ receipts: Receipt[]; withdrawals: Withdrawal[] }>({
    queryKey: ["balance", "history"],
    queryFn: () => apiFetch("/api/balance/history"),
    enabled: !!isSignedIn,
  })

  const depositMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Выберите файл чека")
      const amountKopecks = Math.round(parseFloat(depositAmount) * 100)
      if (isNaN(amountKopecks) || amountKopecks < 1000) throw new Error("Минимальное пополнение — 10 ₽")

      const fd = new FormData()
      fd.append("receipt", selectedFile)
      fd.append("amount", String(amountKopecks))

      const res = await fetch("/api/balance/deposit", {
        method: "POST",
        body: fd,
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Ошибка загрузки")
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: "Чек отправлен", description: "Администратор проверит его в ближайшее время." })
      setDepositAmount("")
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ""
      qc.invalidateQueries({ queryKey: ["balance"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amountKopecks = Math.round(parseFloat(withdrawAmount) * 100)
      if (isNaN(amountKopecks) || amountKopecks < (balance?.minWithdrawalKopecks ?? 20000))
        throw new Error(`Минимальная сумма вывода — ${((balance?.minWithdrawalKopecks ?? 20000) / 100).toFixed(0)} ₽`)
      if (!cardNumber.trim()) throw new Error("Введите номер карты")
      if (!cardBank.trim()) throw new Error("Укажите банк")
      return apiFetch("/api/balance/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: amountKopecks, cardNumber, cardBank }),
      })
    },
    onSuccess: () => {
      toast({ title: "Заявка на вывод создана", description: "Деньги придут в течение нескольких часов." })
      setWithdrawAmount("")
      setCardNumber("")
      setCardBank("")
      qc.invalidateQueries({ queryKey: ["balance"] })
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  if (!isSignedIn) {
    return (
      <div className="container max-w-2xl mx-auto py-16 text-center">
        <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Войдите, чтобы управлять кошельком</p>
      </div>
    )
  }

  const feePercent = balance?.withdrawalFeePercent ?? 6
  const withdrawKopecks = Math.round(parseFloat(withdrawAmount) * 100)
  const feeKopecks = isNaN(withdrawKopecks) ? 0 : Math.ceil(withdrawKopecks * feePercent / 100)
  const netKopecks = isNaN(withdrawKopecks) ? 0 : withdrawKopecks - feeKopecks

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Balance card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center gap-3"><Loader2 className="animate-spin h-5 w-5" /><span>Загрузка...</span></div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Баланс</p>
                <p className="text-4xl font-black text-primary mt-1">{balance?.balanceRub} ₽</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-2xl">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="deposit">
        <TabsList className="w-full">
          <TabsTrigger value="deposit" className="flex-1"><ArrowDownToLine className="h-4 w-4 mr-2" />Пополнить</TabsTrigger>
          <TabsTrigger value="withdraw" className="flex-1"><ArrowUpFromLine className="h-4 w-4 mr-2" />Вывести</TabsTrigger>
          <TabsTrigger value="history" className="flex-1"><Clock className="h-4 w-4 mr-2" />История</TabsTrigger>
        </TabsList>

        {/* DEPOSIT */}
        <TabsContent value="deposit" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Пополнение баланса</CardTitle>
              <CardDescription>Переведите деньги на одну из карт и загрузите скриншот/чек</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform cards */}
              {balance?.platformCards?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Карты для перевода:</p>
                  {balance.platformCards.map((c) => (
                    <div key={c.bank} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                      <CreditCard className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-bold text-sm">{c.bank}</p>
                        <p className="font-mono text-base tracking-widest">{c.number}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Сумма пополнения (₽)</Label>
                <Input
                  type="number"
                  min="10"
                  placeholder="Например, 500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Скриншот / фото чека</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
                >
                  {selectedFile ? (
                    <p className="text-sm font-medium text-primary">{selectedFile.name}</p>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <p className="text-sm">Нажмите, чтобы выбрать файл</p>
                      <p className="text-xs">JPG, PNG, до 10 МБ</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <Button
                className="w-full font-bold"
                onClick={() => depositMutation.mutate()}
                disabled={depositMutation.isPending || !depositAmount || !selectedFile}
              >
                {depositMutation.isPending ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Отправка...</> : "Отправить чек на проверку"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WITHDRAW */}
        <TabsContent value="withdraw" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Вывод средств</CardTitle>
              <CardDescription>Комиссия {feePercent}% · Минимум {((balance?.minWithdrawalKopecks ?? 20000) / 100).toFixed(0)} ₽</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Сумма вывода (₽)</Label>
                <Input
                  type="number"
                  min={((balance?.minWithdrawalKopecks ?? 20000) / 100)}
                  placeholder="Например, 1000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                {withdrawAmount && !isNaN(withdrawKopecks) && withdrawKopecks > 0 && (
                  <div className="text-sm text-muted-foreground space-y-0.5 bg-muted/30 rounded-lg p-3">
                    <div className="flex justify-between"><span>Комиссия ({feePercent}%)</span><span>-{(feeKopecks / 100).toFixed(2)} ₽</span></div>
                    <div className="flex justify-between font-bold text-foreground"><span>Вы получите</span><span>{(netKopecks / 100).toFixed(2)} ₽</span></div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Номер карты</Label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                />
              </div>

              <div className="space-y-2">
                <Label>Банк</Label>
                <Input
                  placeholder="Например, Сбербанк"
                  value={cardBank}
                  onChange={(e) => setCardBank(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>После создания заявки деньги спишутся с баланса. Средства поступят в течение нескольких часов после обработки администратором.</span>
              </div>

              <Button
                className="w-full font-bold"
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending || !withdrawAmount || !cardNumber || !cardBank}
              >
                {withdrawMutation.isPending ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Обработка...</> : "Создать заявку на вывод"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground">Пополнения</p>
            {history?.receipts?.length === 0 && <p className="text-sm text-muted-foreground">Нет пополнений</p>}
            {history?.receipts?.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border">
                <div>
                  <p className="font-bold">+{(r.amount / 100).toFixed(2)} ₽</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("ru")}</p>
                  {r.adminNote && <p className="text-xs text-muted-foreground mt-0.5">Примечание: {r.adminNote}</p>}
                </div>
                {statusBadge(r.status)}
              </div>
            ))}

            <p className="font-semibold text-sm text-muted-foreground pt-2">Выводы</p>
            {history?.withdrawals?.length === 0 && <p className="text-sm text-muted-foreground">Нет выводов</p>}
            {history?.withdrawals?.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl border">
                <div>
                  <p className="font-bold">-{(w.amount / 100).toFixed(2)} ₽ → {(w.netAmount / 100).toFixed(2)} ₽</p>
                  <p className="text-xs text-muted-foreground">{w.cardBank} · {w.cardNumber.slice(-4).padStart(w.cardNumber.length, "•")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString("ru")}</p>
                  {w.adminNote && <p className="text-xs text-muted-foreground mt-0.5">Примечание: {w.adminNote}</p>}
                </div>
                {statusBadge(w.status)}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
