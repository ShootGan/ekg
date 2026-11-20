import { Component, type ReactNode } from 'react';
import { useHashRoute } from './lib/hash';
import { NAV, matchRoute } from './routes';
import { NotFound } from './pages/NotFound';
import { PulseMark } from './components/PulseMark';
import { StylePicker } from './components/StylePicker';

class Guard extends Component<{ children: ReactNode; resetKey: string }, { err: Error | null; key: string }> {
  state = { err: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  static getDerivedStateFromProps(p: { resetKey: string }, s: { err: Error | null; key: string }) {
    return p.resetKey !== s.key ? { err: null, key: p.resetKey } : null;
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="card" role="alert">
        <h3>Coś poszło nie tak</h3>
        <p className="muted">{this.state.err.message}</p>
        <a href="#/">← Strona główna</a>
      </div>
    );
  }
}

export function App() {
  const { path } = useHashRoute();
  const route = matchRoute(path);
  const Page = route ? route.page : NotFound;

  return (
    <div className="shell">
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href="#/">
            <PulseMark height={15} />
            <span className="brand-name">EKG</span>
            <small>atlas i trener opisu</small>
          </a>
          <nav className="nav" aria-label="Nawigacja główna">
            {NAV.map((item) => (
              <a key={item.path} href={'#' + item.path} aria-current={route === item ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
          <StylePicker compact />
        </div>
      </header>
      <main className="main">
        <div className="wrap">
          <Guard resetKey={path}>
            <Page />
          </Guard>
        </div>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <span>Model wektorowy serca · materiał do nauki, nie zastępuje decyzji klinicznej</span>
        </div>
      </footer>
    </div>
  );
}
