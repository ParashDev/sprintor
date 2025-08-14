"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Loader2, 
  Mail, 
  Lock, 
  User,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Users,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Header } from "@/components/landing/Header"
import { Footer } from "@/components/landing/Footer"

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Sign In form state
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  
  // Sign Up form state
  const [signUpName, setSignUpName] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("")
  
  // Reset password state
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
      toast.success("Welcome back! Redirecting to dashboard...")
    } catch (error: Record<string, unknown>) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Sign-in cancelled")
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Network error. Please check your connection.")
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Popup blocked. Please allow popups and try again.")
      } else {
        toast.error("Failed to sign in. Please try again.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningIn(true)
    try {
      await signInWithEmail(signInEmail, signInPassword)
      toast.success("Welcome back! Redirecting to dashboard...")
    } catch (error: Record<string, unknown>) {
      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error("No account found with this email address")
          break
        case 'auth/wrong-password':
          toast.error("Incorrect password. Please try again.")
          break
        case 'auth/invalid-email':
          toast.error("Please enter a valid email address")
          break
        case 'auth/invalid-credential':
          toast.error("Invalid email or password. Please check your credentials.")
          break
        case 'auth/too-many-requests':
          toast.error("Too many failed attempts. Please try again later.")
          break
        case 'auth/user-disabled':
          toast.error("This account has been disabled. Please contact support.")
          break
        case 'auth/network-request-failed':
          toast.error("Network error. Please check your connection and try again.")
          break
        default:
          toast.error("Sign in failed. Please check your credentials and try again.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signUpPassword !== signUpConfirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    
    if (signUpPassword.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }
    
    setIsSigningIn(true)
    try {
      await signUpWithEmail(signUpEmail, signUpPassword, signUpName)
      toast.success("Account created successfully! Redirecting to dashboard...")
    } catch (error: Record<string, unknown>) {
      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          toast.error("An account with this email already exists. Try signing in instead.")
          break
        case 'auth/invalid-email':
          toast.error("Please enter a valid email address")
          break
        case 'auth/weak-password':
          toast.error("Password is too weak. Please use at least 6 characters with a mix of letters and numbers.")
          break
        case 'auth/operation-not-allowed':
          toast.error("Email/password sign-up is not enabled. Please contact support.")
          break
        case 'auth/network-request-failed':
          toast.error("Network error. Please check your connection and try again.")
          break
        default:
          toast.error("Failed to create account. Please try again.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningIn(true)
    try {
      await resetPassword(resetEmail)
      toast.success("Password reset email sent! Check your inbox and spam folder.")
      setShowResetPassword(false)
      setResetEmail("")
    } catch (error: Record<string, unknown>) {
      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error("No account found with this email address")
          break
        case 'auth/invalid-email':
          toast.error("Please enter a valid email address")
          break
        case 'auth/too-many-requests':
          toast.error("Too many reset attempts. Please wait a moment and try again.")
          break
        case 'auth/network-request-failed':
          toast.error("Network error. Please check your connection and try again.")
          break
        default:
          toast.error("Failed to send reset email. Please try again.")
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Features */}
          <div className="hidden lg:block space-y-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
                Welcome to Sprintor Host
              </h1>
              <p className="text-xl text-muted-foreground">
                Sign in to unlock powerful features for managing your sprint planning sessions
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="p-2 bg-primary/10 rounded-lg h-fit">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Session Management</h3>
                  <p className="text-sm text-muted-foreground">Track all your sessions, view history, and manage team retrospectives</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 bg-primary/10 rounded-lg h-fit">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Team Presets</h3>
                  <p className="text-sm text-muted-foreground">Save your team members for quick session setup</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 bg-primary/10 rounded-lg h-fit">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Analytics & Reports</h3>
                  <p className="text-sm text-muted-foreground">Get insights into estimation patterns and team velocity</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 bg-primary/10 rounded-lg h-fit">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Export & Integrations</h3>
                  <p className="text-sm text-muted-foreground">Export to CSV, PDF, and integrate with Jira or Azure DevOps</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth Card */}
          <Card className="shadow-2xl border-border/50 backdrop-blur">
            {showResetPassword ? (
              // Reset Password Form
              <>
                <CardHeader>
                  <CardTitle>Reset Password</CardTitle>
                  <CardDescription>
                    Enter your email address and we&apos;ll send you a password reset link
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={isSigningIn}>
                        {isSigningIn ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Reset Email"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowResetPassword(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : (
              // Sign In / Sign Up Tabs
              <Tabs defaultValue="signin" className="w-full">
                <CardHeader>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <TabsContent value="signin">
                  <CardContent className="space-y-4">
                    <form onSubmit={handleEmailSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            value={signInEmail}
                            onChange={(e) => setSignInEmail(e.target.value)}
                            autoComplete="email"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="link"
                          className="px-0"
                          onClick={() => setShowResetPassword(true)}
                        >
                          Forgot password?
                        </Button>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSigningIn}>
                        {isSigningIn ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Sign in with Email
                          </>
                        )}
                      </Button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </Button>
                  </CardContent>
                </TabsContent>

                <TabsContent value="signup">
                  <CardContent className="space-y-4">
                    <form onSubmit={handleEmailSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            className="pl-10"
                            value={signUpName}
                            onChange={(e) => setSignUpName(e.target.value)}
                            autoComplete="name"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            autoComplete="email"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 6 characters"
                            className="pl-10 pr-10"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-confirm-password"
                            type="password"
                            placeholder="Re-enter your password"
                            className="pl-10"
                            value={signUpConfirmPassword}
                            onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSigningIn}>
                        {isSigningIn ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or sign up with
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      By signing up, you agree to our{" "}
                      <Link href="#" className="underline hover:text-foreground">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="#" className="underline hover:text-foreground">
                        Privacy Policy
                      </Link>
                    </p>
                  </CardContent>
                </TabsContent>
              </Tabs>
            )}

            {/* Anonymous info */}
            {!showResetPassword && (
              <div className="px-6 pb-6">
                <Separator className="mb-4" />
                <p className="text-center text-sm text-muted-foreground">
                  Participants can still join sessions anonymously.
                  <br />
                  Only hosts need to sign in for advanced features.
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}