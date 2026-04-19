import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { BookOpen, Network, Server, Cloud } from 'lucide-react'

/** Home / Labs index page — full implementation in phase 02 */
export default function IndexPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cloud Labs</h1>
        <p className="text-muted-foreground mt-2">
          Hands-on labs để học Cloud/DevOps theo kiểu thực hành.
        </p>
      </div>

      {/* Category cards — placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Network className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Networking</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>TCP/IP, DNS, Load Balancing, VPC fundamentals.</CardDescription>
            <div className="mt-3 flex flex-wrap gap-1">
              <Badge variant="secondary">DNS</Badge>
              <Badge variant="secondary">TCP/IP</Badge>
              <Badge variant="secondary">VPC</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Server className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Containers</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Docker, Kubernetes, container networking.</CardDescription>
            <div className="mt-3 flex flex-wrap gap-1">
              <Badge variant="secondary">Docker</Badge>
              <Badge variant="secondary">K8s</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <Cloud className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Cloud Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>AWS, GCP, Azure core services.</CardDescription>
            <div className="mt-3 flex flex-wrap gap-1">
              <Badge variant="secondary">AWS</Badge>
              <Badge variant="secondary">GCP</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button asChild>
          <Link to="/search">
            <BookOpen className="mr-2 h-4 w-4" />
            Browse all labs
          </Link>
        </Button>
      </div>
    </div>
  )
}
