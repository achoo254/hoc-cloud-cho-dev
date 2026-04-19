import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Lab viewer page — full implementation in phase 03 */
export default function LabViewerPage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Labs
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Lab</Badge>
            <Badge variant="secondary">Placeholder</Badge>
          </div>
          <CardTitle className="mt-2">Lab: {slug}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Lab viewer will be implemented in phase 03. This route confirms routing works correctly
            for slug: <code className="font-mono text-sm bg-muted px-1 rounded">{slug}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
