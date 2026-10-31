import { navigate, useRoute } from './lib/router'
import { Home } from './routes/Home'
import { Setup } from './routes/Setup'
import { Room } from './routes/Room'
import { Button } from './components/ui/Button'

export default function App() {
  const route = useRoute()

  if (route.name === 'home') return <Home />
  if (route.name === 'setup') return <Setup url={route.url} preset={route.preset} />
  if (route.name === 'room') return <Room key={route.id} id={route.id} token={route.token} />

  return (
    <div className="home">
      <main className="home-main">
        <h1 className="home-title">这一页不存在。</h1>
        <div>
          <Button variant="primary" onClick={() => navigate('/')}>
            回首页
          </Button>
        </div>
      </main>
    </div>
  )
}
