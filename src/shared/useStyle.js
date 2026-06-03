import { useContext } from 'react';
import { ThemeContext } from './theme-context.jsx';

export function useStyle() {
  const { style, setStyle } = useContext(ThemeContext);
  return { style, setStyle };
}
