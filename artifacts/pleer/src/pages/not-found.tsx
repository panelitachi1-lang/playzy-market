export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
      <p className="text-muted-foreground mb-8">Страница не найдена</p>
      <a href="/" className="text-primary hover:underline font-bold">
        Вернуться на главную
      </a>
    </div>
  )
}
