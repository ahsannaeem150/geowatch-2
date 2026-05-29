import { useContext } from 'react';
import { ThemeContext } from './theme-context.jsx';

export function useTheme() {
  return useContext(ThemeContext);
}
