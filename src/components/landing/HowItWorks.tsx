import { Card, CardContent } from "@/components/ui/card"

const steps = [
  {
    number: "1",
    title: "Create or Join Room",
    description: "Scrum Master creates a room and shares the room code. Team members join using the code."
  },
  {
    number: "2",
    title: "Add User Stories",
    description: "Host adds user stories to be estimated. Stories can be imported or added manually."
  },
  {
    number: "3",
    title: "Vote Simultaneously",
    description: "All team members select their estimates simultaneously. Votes remain hidden until everyone votes."
  },
  {
    number: "4",
    title: "Reveal & Discuss",
    description: "Votes are revealed together. Team discusses differences and re-votes if needed to reach consensus."
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