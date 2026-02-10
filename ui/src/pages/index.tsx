/**
 * Landing page - redirects to dashboard
 */

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getCurrentUser } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  const user = getCurrentUser()
  
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [user, router])
  
  return null
}

// No layout for redirect page
Home.getLayout = (page: React.ReactNode) => page
