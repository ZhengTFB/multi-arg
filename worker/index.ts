import type { Env } from './types'

export { RoomDO } from './room'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'not_ready' }, { status: 501 })
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
