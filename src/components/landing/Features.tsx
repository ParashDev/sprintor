import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { 
  Zap, 
  Shield, 
  Plus, 
  Star, 
  FileText, 
  Smartphone 
} from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Real-time Collaboration",
    description: "Peer-to-peer connection means instant updates. No lag, no delays - see team votes in real-time."
  },
  {
    icon: Shield,
    title: "No Servers Required",
    description: "Direct browser-to-browser connection. Your data never leaves your network - 100% private and secure."
  },
  {
    icon: Plus,
    title: "Easy Session Creation",
    description: "Create rooms instantly. Share a simple room code with your team and start estimating in seconds."
  },
  {
    icon: Star,
    title: "Multiple Card Decks",
    description: "Fibonacci, T-shirt sizes, powers of 2, or custom values. Choose the estimation scale that works for your team."
  },
  {
    icon: FileText,
    title: "Export Results",
    description: "Download your estimation results as CSV or JSON for sprint planning and future reference."
  },
  {
    icon: Smartphone,
    title: "Mobile Responsive",
    description: "Perfect experience on desktop, tablet, and mobile. Estimate from anywhere, on any device."
  }
]

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-32 bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Why Choose Sprintor?
          </h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}