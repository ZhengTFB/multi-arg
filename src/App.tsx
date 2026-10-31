import { navigate, useRoute } from './lib/router'
import { t } from './lib/copy'
import { Home } from './routes/Home'
import { Setup } from './routes/Setup'
import { Room } from './routes/Room'
import { Button } from './components/ui/Button'
import { CopyEditor } from './components/CopyEditor'

export default function App() {
  const route = useRoute()

  return (
    <>
      {route.name === 'home' && <Home />}
      {route.name === 'setup' && <Setup url={route.url} preset={route.preset} />}
      {route.name === 'room' && <Room key={route.id} id={route.id} token={route.token} />}
      {route.name === 'unknown' && (
        <div className="home">
          <main className="home-main">
            <h1 className="home-title" data-copy="app.notfound">
              {t('app.notfound')}
            </h1>
            <div>
              <Button variant="primary" onClick={() => navigate('/')}>
                {t('app.home')}
              </Button>
            </div>
          </main>
        </div>
      )}
      <CopyEditor />
    </>
  )
}
