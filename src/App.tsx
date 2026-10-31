import { useEffect, useState } from 'react';
import { BookOpen, LayoutGrid, ListChecks, Mic } from 'lucide-react';
import { Story } from './pages/Story';
import { Speak } from './pages/Speak';
import { Track } from './pages/Track';
import { Console } from './pages/Console';
import { useCase } from './store';

const ROUTES = [
  { id: 'story', label: 'Story', Icon: BookOpen },
  { id: 'speak', label: 'Speak', Icon: Mic },
  { id: 'track', label: 'Track', Icon: ListChecks },
  { id: 'console', label: 'Console', Icon: LayoutGrid },
] as const;

type RouteId = (typeof ROUTES)[number]['id'];

function parse(): RouteId {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (ROUTES.find((r) => r.id === h)?.id ?? 'story') as RouteId;
}

export function go(id: RouteId) {
  window.location.hash = `/${id}`;
}

export default function App() {
  const [route, setRoute] = useState<RouteId>(parse);
  const c = useCase();

  useEffect(() => {
    const onHash = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const label = ROUTES.find((r) => r.id === route)?.label;
    document.title = route === 'story' ? 'NovaClear · Pass the work. Not the customer.' : `${label} · NovaClear`;
  }, [route]);

  return (
    <div className={`app route-${route}`}>
      <header className="topbar">
        <a className="wordmark" href="#/story" aria-label="NovaClear home">
          NovaClear
        </a>
        <nav className="nav nav-top" aria-label="Main">
          {ROUTES.map((r) => (
            <a key={r.id} href={`#/${r.id}`} className="nav-item" aria-current={route === r.id ? 'page' : undefined}>
              {r.label}
            </a>
          ))}
        </nav>
        <span className="topbar-meta mono">{route === 'track' || route === 'speak' ? `Case ${c.id}` : 'Team 2 · demo'}</span>
      </header>

      <main className="main" id="main">
        {route === 'story' && <Story />}
        {route === 'speak' && <Speak />}
        {route === 'track' && <Track />}
        {route === 'console' && <Console />}
      </main>

      <nav className="nav nav-bottom" aria-label="Main">
        {ROUTES.map(({ id, label, Icon }) => (
          <a key={id} href={`#/${id}`} className="nav-item" aria-current={route === id ? 'page' : undefined}>
            <span className="nav-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
