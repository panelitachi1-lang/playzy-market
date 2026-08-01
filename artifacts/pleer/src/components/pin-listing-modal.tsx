import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Flame, Loader2, Wallet } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface PinPrice { hours: number; kopecks: number; rub: number; label: string }

export function PinListingModal({
  listingId,
  open,
  onClose,
}: {
  listingId: number
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [selectedHours, setSelectedHours] = useState<number | null>(null)

  const { data: prices } = useQuery<PinPrice[]>({
    queryKey: ["pin-prices"],
    queryFn: () => apiFetch("/api/pins/prices"),
  })

  const { data: balance } = useQuery<{ balance: number; balanceRub: string }>({
    queryKey: ["balance"],
    queryFn: () => apiFetch("/api/balance"),
  })

  const pinMutation = useMutation({
    mutationFn: (hours: number) =>
      apiFetch(`/api/listings/${listingId}/pin`, {
        method: "POST",
        body: JSON.stringify({ hours }),
      }),
    onSuccess: (data) => {
      toast({
        title: "🔥 Объявление закреплено!",
        description: `Активно до ${new Date(data.expiresAt).toLocaleString("ru")}`,
      })
      qc.invalidateQueries({ queryKey: ["balance"] })
      qc.invalidateQueries({ queryKey: ["listings"] })
      onClose()
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" /> Закрепить объявление
          </DialogTitle>
          <DialogDescription>
            Закреплённые объявления показываются первыми в поиске
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm font-medium">
          <Wallet className="h-4 w-4 text-primary" />
          Баланс: <span className="font-black text-primary">{balance?.balanceRub ?? "—"} ₽</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {prices?.map((p) => (
            <button
              key={p.hours}
              onClick={() => setSelectedHours(p.hours)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedHours === p.hours
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-black text-lg">{p.label}</p>
              <p className="text-primary font-bold mt-1">{p.rub} ₽</p>
            </button>
          ))}
        </div>

        {selectedHours && balance && (
          <div className="text-sm text-muted-foreground">
            Спишется: <strong>{(PIN_PRICE_FOR(prices, selectedHours) / 100).toFixed(0)} ₽</strong>
            {" · "}Остаток: <strong>{((balance.balance - PIN_PRICE_FOR(prices, selectedHours)) / 100).toFixed(2)} ₽</strong>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
          <Button
            className="flex-1 font-bold"
            onClick={() => selectedHours && pinMutation.mutate(selectedHours)}
            disabled={!selectedHours || pinMutation.isPending}
          >
            {pinMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Flame className="h-4 w-4 mr-2" />}
            Закрепить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PIN_PRICE_FOR(prices: PinPrice[] | undefined, hours: number): number {
  return prices?.find((p) => p.hours === hours)?.kopecks ?? 0
}
