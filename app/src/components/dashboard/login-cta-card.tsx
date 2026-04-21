import { Github } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginCtaCardProps {
  title: string
  description: string
  className?: string
}

export function LoginCtaCard({ title, description, className }: LoginCtaCardProps) {
  const { login } = useAuth()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={login}>
          <Github className="mr-2 h-4 w-4" />
          Đăng nhập với GitHub
        </Button>
      </CardContent>
    </Card>
  )
}
