export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              SP
            </div>
            <span className="text-sm text-muted-foreground">
              Built with ❤️ for Agile teams everywhere
            </span>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            © 2025 Sprintor. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}