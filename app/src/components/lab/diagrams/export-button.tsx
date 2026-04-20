/**
 * SVG Export button for diagram playground.
 * Phase 06: SVG-only (PNG cut per RED TEAM #7).
 */

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportSvg, generateExportFilename } from './export-utils'

interface ExportButtonProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  labSlug: string
  frameIdx?: number
}

export function ExportButton({ svgRef, labSlug, frameIdx }: ExportButtonProps) {
  function handleExport() {
    if (!svgRef.current) {
      console.warn('[ExportButton] No SVG ref available')
      return
    }

    const filename = generateExportFilename(labSlug, frameIdx)
    exportSvg(svgRef.current, filename)
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      title="Export as SVG"
    >
      <Download className="w-4 h-4 mr-1" />
      SVG
    </Button>
  )
}
