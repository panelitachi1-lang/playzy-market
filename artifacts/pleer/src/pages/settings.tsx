import { useEffect, useState, useRef } from "react"
import { useGetMyProfile, useUpdateMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react"
import { useUser, useClerk } from "@clerk/react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { Camera, Loader2, User } from "lucide-react"
import { apiFetch } from "@/lib/api"

export function Settings() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const { data: profile, isLoading } = useGetMyProfile()
  const updateProfile = useUpdateMyProfile()

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    city: "",
    avatarUrl: ""
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        city: profile.city || "",
        avatarUrl: profile.avatarUrl || ""
      })
      setAvatarPreview(profile.avatarUrl || null)
    }
  }, [profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)

    setAvatarUploading(true)
    try {
      const body = new FormData()
      body.append("avatar", file)
      const result = await apiFetch("/api/users/me/avatar", { method: "POST", body })
      setFormData(prev => ({ ...prev, avatarUrl: result.avatarUrl }))
      toast({ title: "Аватар обновлён" })
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() })
    } catch {
      toast({ title: "Ошибка загрузки аватара", variant: "destructive" })
      setAvatarPreview(profile?.avatarUrl || null)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    updateProfile.mutate({
      data: formData
    }, {
      onSuccess: () => {
        toast({ title: "Профиль обновлён" })
        queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() })
      },
      onError: (error: any) => {
        const message = error?.message || ""
        if (message.includes("занят") || message.includes("409") || error?.status === 409) {
          toast({ title: "Никнейм уже занят", description: "Выберите другой никнейм.", variant: "destructive" })
        } else {
          toast({ title: "Ошибка при сохранении", variant: "destructive" })
        }
      }
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-2">Настройки</h1>
        <p className="text-muted-foreground">Управляйте своим профилем и настройками аккаунта.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Публичный профиль</CardTitle>
          <CardDescription>Эта информация будет отображаться на вашей странице профиля.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">Имя пользователя</Label>
                <Input id="username" name="username" value={formData.username} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Отображаемое имя</Label>
                <Input id="displayName" name="displayName" value={formData.displayName} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Аватар</Label>
              <div className="flex items-center gap-4">
                {/* Preview circle */}
                <div className="relative flex-shrink-0">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Аватар" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 font-semibold"
                  >
                    <Camera className="h-4 w-4" />
                    {avatarUploading ? "Загрузка..." : "Загрузить фото"}
                  </Button>
                  <span className="text-xs text-muted-foreground">JPG, PNG, GIF · до 5 МБ</span>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">О себе</Label>
              <Textarea 
                id="bio" 
                name="bio" 
                value={formData.bio} 
                onChange={handleChange} 
                className="min-h-[100px]"
                placeholder="Расскажите немного о себе..."
              />
            </div>

            <Button type="submit" disabled={updateProfile.isPending} className="font-bold">
              {updateProfile.isPending ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Управление аккаунтом</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Вы вошли как <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
          </p>
          <Button variant="destructive" onClick={() => signOut({ redirectUrl: "/" })} className="font-bold">
            Выйти
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
