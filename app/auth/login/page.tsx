'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      console.log('[Login] Starting login process...')
      
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('[Login] Auth response:', { authData, signInError })

      if (signInError) throw signInError

      if (!authData.user) {
        throw new Error('No user data returned from sign in')
      }

      console.log('[Login] User signed in:', authData.user.id)

      // Get user role to redirect appropriately - retry a few times if profile doesn't exist yet
      let profile = null
      let profileError = null
      
      for (let i = 0; i < 3; i++) {
        const result = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()
        
        profile = result.data
        profileError = result.error
        
        if (profile) break
        
        // Wait a bit before retrying
        if (i < 2) {
          console.log('[Login] Profile not found, retrying...')
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log('[Login] Profile data:', { profile, profileError })

      if (!profile || profileError) {
        console.warn('[Login] Profile not found after retries, creating it now...')
        
        // Create profile if it doesn't exist
        const { error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: authData.user.email,
            role: 'subscriber',
            full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0]
          }, {
            onConflict: 'id'
          })
        
        if (createError) {
          console.error('[Login] Failed to create profile:', createError)
        }
        
        // Default to subscriber dashboard
        console.log('[Login] Redirecting to default: /dashboard/letters')
        router.push('/dashboard/letters')
        router.refresh()
        return
      }

      const roleRedirects: Record<string, string> = {
        'subscriber': '/dashboard/letters',
        'employee': '/dashboard/commissions',
        'admin': '/dashboard/admin/letters'
      }

      const redirectPath = roleRedirects[profile?.role || 'subscriber']
      console.log('[Login] Redirecting to:', redirectPath)
      
      router.push(redirectPath)
      router.refresh()
    } catch (err: any) {
      console.error('[Login] Error:', err)
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access Talk-To-My-Lawyer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:text-primary/80 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
