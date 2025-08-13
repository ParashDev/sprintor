"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Home } from "lucide-react"

interface SessionEndedDialogProps {
  onConfirm: () => void
}

export function SessionEndedDialog({ onConfirm }: SessionEndedDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Session Ended</CardTitle>
            <CardDescription className="text-base mt-2">
              The session has been ended by the host
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-sm text-center text-muted-foreground">
            You will be redirected to the home page.
          </div>

          <Button 
            onClick={onConfirm}
            className="w-full h-12"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}