/**
 * Generic placeholder page reused by all modules that are not yet implemented.
 * Accepts a `module` prop for the display name.
 */

import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Card } from '@/components/ui'
import { toTitleCase } from '@/utils'

interface PlaceholderPageProps {
  module: string
}

export default function PlaceholderPage({ module }: PlaceholderPageProps) {
  const title = toTitleCase(module)
  useDocumentTitle(title)

  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
        <span className="text-2xl text-primary-500" aria-hidden="true">⚙</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        This module is under construction. Check back once the feature has been implemented.
      </p>
    </Card>
  )
}
