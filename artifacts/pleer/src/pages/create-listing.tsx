import { useState, useCallback } from "react"
import { useLocation } from "wouter"
import { useCreateListing, ListingInputType } from "@workspace/api-client-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gamepad2, Zap, ImagePlus, X, Loader2 } from "lucide-react"

export function CreateListing() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const createListing = useCreateListing()
  const [type, setType] = useState<"sell" | "buy">("sell")
  const [secretLogin, setSecretLogin] = useState("")
  const [secretPassword, setSecretPassword] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [photos, setPhotos] = useState<{ preview: string; url: string }[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [formData, setFormData] = useState({ title: "", description: "", price: "", category: "", condition: "Алмазы", city: "нлайн" })

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast({ title: "Ошибка", description: "Загрузите изображение.", variant: "destructive" }); return }
    if (photos.length >= 10) { toast({ title: "Максимум 10 фото", variant: "destructive" }); return }
    const preview = URL.createObjectURL(file)
    setPhotos(prev => [...prev, { preview, url: "" }])
    try {
      const body = new FormData()
      body.append("image", file)
      const res = await fetch("/api/listings/upload-image", { method: "POST", credentials: "include", body })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPhotos(prev => prev.map(p => p.preview === preview ? { ...p, url: data.imageUrl } : p))
    } catch {
      toast({ title: "шибка загрузки фото", variant: "destructive" })
      setPhotos(prev => prev.filter(p => p.preview !== preview))
    }
  }, [toast, photos.length])

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); Array.from(e.dataTransfer.files).forEach(f => handleFileSelect(f)) }, [handleFileSelect])
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.price || !formData.category) { toast({ title: "Ошибка валидации", description: "Заполните все обязательные поля.", variant: "destructive" }); return }
    if (type === "sell" && (!secretLogin || !secretPassword)) { toast({ title: "Укажите данные для покупателя", description: "аполните логин и пароль.", variant: "destructive" }); return }
    const uploadedPhotos = photos.filter(p => p.url)
    createListing.mutate({ data: { title: formData.title, description: formData.description, price: Math.round(Number(formData.price) * 100), type: type as ListingInputType, category: formData.category, condition: formData.condition, city: formData.city, imageUrl: uploadedPhotos[0]?.url || "", imagesJson: JSON.stringify(uploadedPhotos.map(p => p.url)), secretData: secretLogin && secretPassword ? JSON.stringify({ login: secretLogin, password: secretPassword }) : undefined, secretType: "credentials" } as any }, {
      onSuccess: (newListing) => { toast({ title: "бъявление отправлено на проверку", description: "После проверки модератором оно появится в каталоге." }); setLocation(`/listings/${newListing.id}`) },
      onError: () => { toast({ title: "Ошибка", description: "Не удалось создать объявление.", variant: "destructive" }) }
    })
  }

  const GAMES = ["Free Fire", "PUBG Mobile", "Telegram", "Roblox", "Brawl Stars", "Genshin Impact", "CS2", "Steam", "Mobile Legends", "Minecraft", "Стриминг", "ругое"]
  const ITEM_TYPES = ["Алмазы", "UC", "Звёзды", "Аккаунт", "Скин", "Робуксы", "Гемы", "ополнение", "Подписка", "Другое"]

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Card className="border-border shadow-lg overflow-hidden">
        <CardHeader className="bg-card border-b border-border px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <CardTitle className="text-3xl font-black relative z-10">Разместить объявление</CardTitle>
          <p className="text-muted-foreground mt-2 font-medium relative z-10">Продавайте и покупайте игровые ценности быстро и безопасно.</p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3 bg-muted/30 p-1.5 rounded-xl border border-border">
              <Tabs value={type} onValueChange={(v) => setType(v as "sell" | "buy")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-transparent">
                  <TabsTrigger value="sell" className="font-bold text-base data-[state=active]:bg-background data-[state=active]:text-primary rounded-lg">Я продаю</TabsTrigger>
                  <TabsTrigger value="buy" className="font-bold text-base data-[state=active]:bg-background data-[state=active]:text-primary rounded-lg">Я покупаю</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-bold flex items-center gap-2"><ImagePlus className="w-4 h-4 text-primary" /> Фото товара ({photos.length}/10)</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border-2 border-primary/30 aspect-square">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    {!p.url && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>}
                    {i === 0 && <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full">лавное</div>}
                    <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <label onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed cursor-pointer ${isDragOver ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files || []).forEach(f => handleFileSelect(f)); e.target.value = "" }} />
                    <ImagePlus className="w-7 h-7 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground font-medium text-center px-1">Добавить фото</span>
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="title" className="text-base font-bold">Название </Label>
              <Input id="title" name="title" value={formData.title} onChange={handleChange} placeholder="Например: Аккаунт с легами или 1000 алмазов" className="h-12 text-lg bg-card" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="price" className="text-base font-bold">Цена (₽)</Label>
                <Input id="price" name="price" type="number" min="0" value={formData.price} onChange={handleChange} placeholder="Например: 500" className="h-12 font-mono font-bold text-lg bg-card" required />
              </div>
              <div className="space-y-3">
                <Label htmlFor="category" className="text-base font-bold flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-primary" /> Игра / Платформа</Label>
                <select id="category" name="category" value={formData.category} onChange={handleChange} className="flex h-12 w-full rounded-xl border border-input bg-card px-3 py-1 text-base font-medium outline-none" required>
                  <option value="" disabled>Выберите игру...</option>
                  {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="condition" className="text-base font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Тип товара</Label>
              <select id="condition" name="condition" value={formData.condition} onChange={handleChange} className="flex h-12 w-full rounded-xl border border-input bg-card px-3 py-1 text-base font-medium outline-none">
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-bold">Описание</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Опишите товар подробнее..." className="min-h-[140px] text-base bg-card resize-y" />
            </div>
            {type === "sell" && (
              <div className="space-y-3 p-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
                <Label className="text-base font-bold">Данные для покупателя (получит после оплаты)</Label>
                <Input value={secretLogin} onChange={e => setSecretLogin(e.target.value)} placeholder="Email или логин" className="bg-background" autoComplete="off" />
                <div className="relative">
                  <Input type={showSecret ? "text" : "password"} value={secretPassword} onChange={e => setSecretPassword(e.target.value)} placeholder="Пароль" className="bg-background pr-24" autoComplete="off" />
                  <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">{showSecret ? "Скрыть" : "Показать"}</button>
                </div>
              </div>
            )}
            <Button type="submit" size="lg" className="w-full h-14 font-black text-xl rounded-xl shadow-lg shadow-primary/20" disabled={createListing.isPending}>
              {createListing.isPending ? "Публикация..." : "Опубликовать объявление"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
