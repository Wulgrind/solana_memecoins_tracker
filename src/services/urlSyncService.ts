import type { Widget } from '../store/widgetStore'

export const urlSyncService = {
  encodeWidgets(widgets: Widget[]): string {
    const encoded = widgets.map(w =>
      `${w.type}:${w.tokenAddress}:${w.x}:${w.y}`
    ).join(',')
    return encoded
  },

  decodeWidgets(urlParam: string | null): Widget[] {
    if (!urlParam) return []

    try {
      return urlParam.split(',').map((item, index) => {
        const [type, tokenAddress, x, y] = item.split(':')

        if (!type || !tokenAddress || !x || !y) {
          console.warn('Invalid widget format in URL:', item)
          return null
        }

        return {
          id: `widget-${Date.now()}-${index}`,
          type,
          title: type === 'live-price' ? 'Live Price Widget' : 'Trade Feed Widget',
          tokenAddress,
          x: parseInt(x),
          y: parseInt(y)
        }
      }).filter((w): w is Widget => w !== null)
    } catch (error) {
      console.error('Error decoding widgets from URL:', error)
      return []
    }
  },

  updateURL(widgets: Widget[]) {
    const params = new URLSearchParams(window.location.search)

    if (widgets.length === 0) {
      params.delete('w')
    } else {
      params.set('w', this.encodeWidgets(widgets))
    }

    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname

    window.history.replaceState({}, '', newURL)
  },

  getWidgetsFromURL(): Widget[] {
    const params = new URLSearchParams(window.location.search)
    return this.decodeWidgets(params.get('w'))
  }
}
