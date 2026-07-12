/**
 * Set the browser tab title, appending the app name automatically.
 */

import { useEffect } from 'react'

const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'AssetFlow'

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    return () => {
      document.title = APP_NAME
    }
  }, [title])
}
