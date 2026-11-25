import { Component, type ReactNode } from 'react';
import { useHashRoute } from './lib/hash';
import { matchRoute } from './routes';
import { PulseMark } from './components/PulseMark';

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
  const Page = route.page;

  return (
    <div className="shell">
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href="#/">
            <PulseMark height={15} />
            <span className="brand-name">EKG</span>
            <small>quiz EKG</small>
          </a>
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
