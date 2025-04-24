import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/signin',
    error: '/error'
  }
})

export const config = {
  matcher: ['/dashboard', '/transactions']
}