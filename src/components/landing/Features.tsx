import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { 
  Zap, 
  FolderOpen, 
  Plus, 
  Star, 
  BarChart3, 
  Smartphone,
  Users,
  History
} from "lucide-react"

const features = [
  {
    icon: FolderOpen,
    title: "Project Management",
    description: "Organize your work into projects with sessions, stories, and team management. Complete project lifecycle tracking."
  },
  {
    icon: Zap,
    title: "Real-time Collaboration",
    description: "Live updates across all participants. See team votes and discussions in real-time with instant synchronization."
  },
  {
    icon: Plus,
    title: "Easy Session Creation",
    description: "Create planning sessions instantly within your projects. Share room codes and start estimating in seconds."
  },
  {
    icon: Star,
    title: "Multiple Card Decks",
    description: "Fibonacci, T-shirt sizes, powers of 2, or custom values. Choose the estimation scale that works for your team."
  },
  {
    icon: BarChart3,
    title: "Project Analytics",
    description: "Track team velocity, estimation accuracy, and project progress with detailed insights and reporting."
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Invite team members, manage permissions, and create reusable team templates for faster session setup."
  },
  {
    icon: History,
    title: "Session History",
    description: "Access all past planning sessions with complete voting history, estimates, and team participation data."
  },
  {
    icon: Smartphone,
    title: "Anonymous Participation",
    description: "Team members can join sessions instantly with just a room code - no account required. Remove barriers to collaboration."
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
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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