import React from 'react';
import { useTheme } from '@shared/useTheme.js';

// Intrinsic aspect ratios of the brand assets (width / height).
const FULL_ASPECT = 437 / 109; // wordmark lockup, with tagline
const NOTAG_ASPECT = 437 / 75; // wordmark lockup, viewBox-cropped above the tagline
const MARK_ASPECT = 1; // "24" tile

/**
 * IntelMap24 brand logo. Renders a plain <img> (never inline SVG — the
 * asset's internal :root CSS vars would collide with site design tokens).
 *
 * variant="full" — wordmark lockup; swaps dark/light asset with the theme.
 *   tag={false} uses the no-tagline crop so the wordmark renders larger.
 * variant="mark" — "24" tile; theme-independent (navy tile works on both).
 */
export default function BrandLogo({ variant = 'full', tag = true, height = 32, style, ...rest }) {
  const { theme } = useTheme();
  const isMark = variant === 'mark';

  let src;
  if (isMark) {
    src = '/brand/intelmap24-mark.svg';
  } else if (theme === 'light') {
    src = tag ? '/brand/intelmap24-lockup-light.svg' : '/brand/intelmap24-lockup-notag-light.svg';
  } else {
    src = tag ? '/brand/intelmap24-lockup.svg' : '/brand/intelmap24-lockup-notag.svg';
  }

  const aspect = isMark ? MARK_ASPECT : tag ? FULL_ASPECT : NOTAG_ASPECT;

  return (
    <img
      src={src}
      alt="IntelMap24"
      height={height}
      width={Math.round(height * aspect)}
      style={{ display: 'block', height, width: 'auto', ...style }}
      {...rest}
    />
  );
}
