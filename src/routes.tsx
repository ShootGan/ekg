import type { ComponentType } from 'react';
import { MenuPage } from './pages/MenuPage';
import { QuizPage } from './pages/QuizPage';

export interface NavItem {
  path: string;
  label: string;
  page: ComponentType;
}

export const NAV: NavItem[] = [
  { path: '/', label: 'Menu', page: MenuPage },
  { path: '/quiz', label: 'Quiz', page: QuizPage },
];

export function matchRoute(path: string): NavItem {
  return path === '/quiz' || path.startsWith('/quiz/') ? NAV[1] : NAV[0];
}
