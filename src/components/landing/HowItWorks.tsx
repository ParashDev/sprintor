import { Card, CardContent } from "@/components/ui/card"

const steps = [
  {
    number: "1",
    title: "Create Your Projects",
    description: "Sign in and create projects to organize your work. Define project details, team, and estimation preferences."
  },
  {
    number: "2",
    title: "Launch Planning Sessions",
    description: "Create planning sessions within your projects. Share room codes with team members for instant participation."
  },
  {
    number: "3",
    title: "Estimate User Stories",
    description: "Add stories to sessions and vote simultaneously. Real-time collaboration with multiple estimation decks."
  },
  {
    number: "4",
    title: "Track Progress & Analytics",
    description: "View session history, team velocity, and project insights. Export data and manage your project lifecycle."
  }
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            How It Works
          </h2>
        </div>
        
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            {steps.map((step, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                      {step.number}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
                {index < steps.length - 1 && (
                  <div className="absolute -bottom-8 left-1/2 hidden h-8 w-px bg-border md:block" />
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}