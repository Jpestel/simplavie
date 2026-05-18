import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      globalRole: string
    }
  }
  interface User {
    id: string
    globalRole: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    globalRole: string
  }
}
