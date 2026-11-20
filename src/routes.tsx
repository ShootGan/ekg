import type { ComponentType } from 'react';
import { Home } from './pages/Home';
import { AtlasPage } from './pages/AtlasPage';
import { TrainerPage } from './pages/TrainerPage';
import { TrainingPage } from './pages/TrainingPage';
import { ProgressPage } from './pages/ProgressPage';

export interface NavItem {
  path: string;
  label: string;
  page: ComponentType;
  hidden?: boolean;
}

export const NAV: NavItem[] = [
  { path: '/', label: 'Start', page: Home },
  { path: '/atlas', label: 'Atlas', page: AtlasPage },
  { path: '/trening', label: 'Trening', page: TrainingPage },
  { path: '/trener', label: 'Trener', page: TrainerPage, hidden: true },
  { path: '/postepy', label: 'Postępy', page: ProgressPage },
];

export function matchRoute(path: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of NAV) {
    if (item.path === path) return item;
    if (item.path !== '/' && path.startsWith(item.path + '/') && (!best || item.path.length > best.path.length)) best = item;
  }
  return best;
}
