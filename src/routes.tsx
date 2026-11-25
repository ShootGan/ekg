import type { ComponentType } from 'react';
import { QuizPage } from './pages/QuizPage';

export interface NavItem {
  path: string;
  label: string;
  page: ComponentType;
}

export const NAV: NavItem[] = [{ path: '/', label: 'Quiz', page: QuizPage }];

export function matchRoute(_path: string): NavItem {
  return NAV[0];
}
