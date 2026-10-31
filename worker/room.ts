import type { Env } from './types'

/** Phase 2 会把房间状态、SQLite 表和 WebSocket 接进来，这里先占位保证路由与类型骨架通过。 */
export class RoomDO {
  readonly state: DurableObjectState
  readonly env: Env

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(): Promise<Response> {
    return new Response('room not ready', { status: 501 })
  }
}
