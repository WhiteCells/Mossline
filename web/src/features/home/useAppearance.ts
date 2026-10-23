import { useEffect, useState } from 'react'
import { apiGet } from '../../shared/api/api'
import { isRecord } from '../../shared/api/record'

export interface SiteAppearance {
  desktop_background_url: string
  mobile_background_url: string
  overlay_enabled: boolean
}

const defaults: SiteAppearance = {
  desktop_background_url: '',
  mobile_background_url: '',
  overlay_enabled: true,
}

export function useAppearance() {
  const [appearance, setAppearance] = useState(defaults)
  useEffect(() => {
    let controller: AbortController | undefined
    const load = () => {
      controller?.abort()
      controller = new AbortController()
      void apiGet('/api/site/appearance', { signal: controller.signal })
        .then((data) => {
          if (!isRecord(data)) return
          setAppearance({
            desktop_background_url:
              typeof data.desktop_background_url === 'string'
                ? data.desktop_background_url
                : '',
            mobile_background_url:
              typeof data.mobile_background_url === 'string'
                ? data.mobile_background_url
                : '',
            overlay_enabled:
              typeof data.overlay_enabled === 'boolean'
                ? data.overlay_enabled
                : true,
          })
        })
        .catch(() => {
          /* 外观加载失败时保留默认插画或上次成功的配置。 */
        })
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      controller?.abort()
      window.removeEventListener('focus', load)
    }
  }, [])
  return appearance
}
