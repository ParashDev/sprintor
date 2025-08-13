"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users, UserPlus } from "lucide-react"
import { Card } from "@/components/ui/card"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="flex flex-col justify-center space-y-8 text-center lg:text-left">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Collaborative Sprint Planning for Agile Teams
              </h1>
              <p className="mx-auto lg:mx-0 max-w-[600px] text-muted-foreground md:text-xl">
                Real-time sprint estimation with your distributed team. No servers, no sign-ups - just pure P2P collaboration.
              </p>
            </div>
            
            <div className="flex flex-col gap-4 sm:flex-row justify-center lg:justify-start">
              <Link href="/create">
                <Button size="lg" className="w-full sm:w-auto">
                  <Users className="mr-2 h-5 w-5" />
                  Host a Session
                </Button>
              </Link>
              <Link href="/join">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Join a Session
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex justify-center lg:justify-end">
            <PlanningCardsDemo />
          </div>
        </div>
      </div>
    </section>
  )
}

function PlanningCardsDemo() {
  return (
    <div className="relative w-full max-w-[500px] h-[280px] md:h-[320px] mx-auto px-4 md:px-0">
      {/* Dealt cards with perfect equal spacing using flexbox */}
      <div className="absolute left-1/2 top-0 transform -translate-x-1/2 flex items-start gap-4 md:gap-6">
        {/* Card 1 - leftmost */}
        <div 
          className="relative w-[55px] h-[85px] md:w-[70px] md:h-[105px] bg-background border-2 md:border-4 border-primary rounded-lg md:rounded-xl shadow-lg flex items-center justify-center text-2xl md:text-3xl font-bold text-primary cursor-pointer transition-all duration-200 hover:-translate-y-2 hover:scale-105 z-50"
          style={{ 
            transform: 'rotate(-12deg)', 
            marginTop: '35px'
          }}
        >
          1
        </div>
        
        {/* Card 2 */}
        <div 
          className="relative w-[55px] h-[85px] md:w-[70px] md:h-[105px] bg-background border-2 md:border-4 border-primary rounded-lg md:rounded-xl shadow-lg flex items-center justify-center text-2xl md:text-3xl font-bold text-primary cursor-pointer transition-all duration-200 hover:-translate-y-2 hover:scale-105 z-50"
          style={{ 
            transform: 'rotate(-6deg)', 
            marginTop: '20px'
          }}
        >
          3
        </div>
        
        {/* Card 3 - middle (center reference point) */}
        <div 
          className="relative w-[55px] h-[85px] md:w-[70px] md:h-[105px] bg-background border-2 md:border-4 border-primary rounded-lg md:rounded-xl shadow-lg flex items-center justify-center text-2xl md:text-3xl font-bold text-primary cursor-pointer transition-all duration-200 hover:-translate-y-2 hover:scale-105 z-50"
          style={{ 
            transform: 'rotate(0deg)', 
            marginTop: '12px'
          }}
        >
          5
        </div>
        
        {/* Card 4 */}
        <div 
          className="relative w-[55px] h-[85px] md:w-[70px] md:h-[105px] bg-background border-2 md:border-4 border-primary rounded-lg md:rounded-xl shadow-lg flex items-center justify-center text-2xl md:text-3xl font-bold text-primary cursor-pointer transition-all duration-200 hover:-translate-y-2 hover:scale-105 z-50"
          style={{ 
            transform: 'rotate(6deg)', 
            marginTop: '20px'
          }}
        >
          8
        </div>
        
        {/* Card 5 - rightmost */}
        <div 
          className="relative w-[55px] h-[85px] md:w-[70px] md:h-[105px] bg-background border-2 md:border-4 border-primary rounded-lg md:rounded-xl shadow-lg flex items-center justify-center text-2xl md:text-3xl font-bold text-primary cursor-pointer transition-all duration-200 hover:-translate-y-2 hover:scale-105 z-50"
          style={{ 
            transform: 'rotate(12deg)', 
            marginTop: '35px'
          }}
        >
          13
        </div>
      </div>
      
      {/* Card deck positioned exactly under the center card - fine-tuned */}
      <div className="absolute bottom-8 group cursor-pointer z-10" style={{ left: 'calc(50% - 25px)', transform: 'translateX(-50%)' }}>
        {/* Bottom deck card */}
        <div className="absolute w-[55px] h-[85px] md:w-[70px] md:h-[105px] rounded-lg md:rounded-xl border-2 md:border-4 border-primary shadow-md transition-all duration-200 opacity-80 bg-gradient-to-br from-muted to-muted-foreground/10 transform rotate-1 translate-x-0.5 translate-y-0.5 group-hover:translate-y-1">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full opacity-30 bg-[repeating-linear-gradient(45deg,_theme(colors.border),_theme(colors.border)_2px,_transparent_2px,_transparent_8px)]"></div>
        </div>
        
        {/* Middle deck card */}
        <div className="absolute w-[55px] h-[85px] md:w-[70px] md:h-[105px] rounded-lg md:rounded-xl border-2 md:border-4 border-primary shadow-md transition-all duration-200 opacity-90 bg-gradient-to-br from-muted to-muted-foreground/10 transform -rotate-1 -translate-x-0.5 -translate-y-0.5 group-hover:-translate-y-0.5 z-20">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full opacity-30 bg-[repeating-linear-gradient(45deg,_theme(colors.border),_theme(colors.border)_2px,_transparent_2px,_transparent_8px)]"></div>
        </div>
        
        {/* Top deck card */}
        <div className="absolute w-[55px] h-[85px] md:w-[70px] md:h-[105px] rounded-lg md:rounded-xl border-2 md:border-4 border-primary shadow-md transition-all duration-200 bg-gradient-to-br from-muted to-muted-foreground/10 transform rotate-2 group-hover:-translate-y-0.5 z-30">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full opacity-30 bg-[repeating-linear-gradient(45deg,_theme(colors.border),_theme(colors.border)_2px,_transparent_2px,_transparent_8px)]"></div>
        </div>
        
        {/* Animated dealing card */}
        <div className="absolute w-[55px] h-[85px] md:w-[70px] md:h-[105px] bg-gradient-to-br from-background to-muted border-2 md:border-4 border-primary rounded-lg md:rounded-xl shadow-lg flex items-center justify-center text-2xl md:text-3xl font-bold text-primary opacity-0 transform rotate-2 transition-all duration-600 ease-out z-40 group-hover:opacity-100 group-hover:-translate-y-[120px] md:group-hover:-translate-y-[160px] group-hover:rotate-3 group-hover:scale-105">
          ?
        </div>
      </div>
    </div>
  )
}