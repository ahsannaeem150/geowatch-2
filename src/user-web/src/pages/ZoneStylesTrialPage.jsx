import React, { useMemo, useState } from 'react';
import './ZoneStylesTrial.css';

const COLORS = {
  red: { stroke: '#ef4444', fill: '#ef4444', label: 'Red' },
  blue: { stroke: '#3b82f6', fill: '#3b82f6', label: 'Blue' },
  amber: { stroke: '#f59e0b', fill: '#f59e0b', label: 'Amber' },
  green: { stroke: '#22c55e', fill: '#22c55e', label: 'Green' },
  purple: { stroke: '#a855f7', fill: '#a855f7', label: 'Purple' },
  cyan: { stroke: '#06b6d4', fill: '#06b6d4', label: 'Cyan' },
  pink: { stroke: '#ec4899', fill: '#ec4899', label: 'Pink' },
  orange: { stroke: '#f97316', fill: '#f97316', label: 'Orange' },
};

const COLOR_KEYS = Object.keys(COLORS);

function darkenHex(hex, amount = 0.45) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, Math.floor(r * amount));
  const dg = Math.max(0, Math.floor(g * amount));
  const db = Math.max(0, Math.floor(b * amount));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

const SHAPES = {
  hexagon: {
    type: 'polygon',
    points: '180,60 260,110 260,190 180,240 100,190 100,110',
  },
  circle: {
    type: 'circle',
    cx: 180,
    cy: 145,
    r: 92,
  },
  triangle: {
    type: 'polygon',
    points: '180,50 280,230 80,230',
  },
  diamond: {
    type: 'polygon',
    points: '180,45 300,145 180,245 60,145',
  },
  pentagon: {
    type: 'polygon',
    points: '180,55 285,115 250,235 110,235 75,115',
  },
};

const SHAPE_LABELS = {
  hexagon: 'Hexagon',
  circle: 'Circle',
  triangle: 'Triangle',
  diamond: 'Diamond',
  pentagon: 'Pentagon',
};

const VARIANTS = {
  'edge-heavy': 'Edge-heavy gradient',
  neon: 'Neon glow',
  'neon-fade': 'Neon fade',
  'neon-fade-shadow': 'Neon fade + inner shadow',
  'neon-fade-shadow-alt': 'Neon fade + inner shadow alt',
  'neon-fade-no-shadow': 'Neon fade no shadow',
  dashed: 'Dashed warning',
  double: 'Double border',
  outline: 'Clean outline',
  soft: 'Soft fill only',
  pulse: 'Pulse active',
  dotted: 'Dotted edge',
  'gradient-stroke': 'Gradient stroke',
  glass: 'Glass overlay',
};

const VARIANT_KEYS = Object.keys(VARIANTS);

const DEFAULT_CONFIGS = {
  hexagon: { style: 'edge-heavy', color: 'blue' },
  circle: { style: 'neon', color: 'red' },
  triangle: { style: 'dashed', color: 'amber' },
  diamond: { style: 'double', color: 'purple' },
  pentagon: { style: 'outline', color: 'green' },
};

function renderShape(shapeId, extraProps = {}) {
  const shape = SHAPES[shapeId];
  if (!shape) return null;
  if (shape.type === 'polygon') {
    return <polygon points={shape.points} {...extraProps} />;
  }
  if (shape.type === 'circle') {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...extraProps} />;
  }
  return null;
}

function ZoneSvg({ shapeId, colorKey, variant, svgKey, className = '', showGrid = true, showCenter = true }) {
  const c = COLORS[colorKey];
  const shape = SHAPES[shapeId];
  const gradId = `grad-${svgKey}`;
  const glowId = `glow-${svgKey}`;
  const strokeGradId = `stroke-${svgKey}`;
  const innerShadowMaskId = `inner-shadow-mask-${svgKey}`;
  const innerShadowFilterId = `inner-shadow-filter-${svgKey}`;

  const isCircle = shape?.type === 'circle';
  const cx = isCircle ? shape.cx : 180;
  const cy = isCircle ? shape.cy : 145;

  const fillGradient = (
    <radialGradient id={gradId} cx='50%' cy='50%' r='50%' fx='50%' fy='50%'>
      {variant === 'neon-fade-shadow' || variant === 'neon-fade-shadow-alt' || variant === 'neon-fade-no-shadow' ? (
        <>
          <stop offset='0%' stopColor={c.fill} stopOpacity='0' />
          <stop offset='55%' stopColor={c.fill} stopOpacity='0.04' />
          <stop offset='85%' stopColor={c.fill} stopOpacity='0.09' />
          <stop offset='100%' stopColor={c.fill} stopOpacity='0.12' />
        </>
      ) : (
        <>
          <stop offset='0%' stopColor={c.fill} stopOpacity={variant === 'neon-fade' ? '0' : '0.05'} />
          <stop offset='55%' stopColor={c.fill} stopOpacity={variant === 'neon-fade' ? '0.06' : '0.22'} />
          <stop offset='85%' stopColor={c.fill} stopOpacity={variant === 'neon-fade' ? '0.14' : '0.55'} />
          <stop offset='100%' stopColor={c.fill} stopOpacity={variant === 'neon-fade' ? '0.22' : '0.75'} />
        </>
      )}
    </radialGradient>
  );

  const glowFilter = (
    <filter id={glowId} x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur in='SourceGraphic' stdDeviation='4' result='blur' />
      <feColorMatrix
        in='blur'
        type='matrix'
        values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7'
        result='goo'
      />
      <feMerge>
        <feMergeNode in='blur' />
        <feMergeNode in='SourceGraphic' />
      </feMerge>
    </filter>
  );

  const innerShadowMask = (variant === 'neon-fade-shadow' || variant === 'neon-fade-shadow-alt') && (
    <mask id={innerShadowMaskId} maskUnits='userSpaceOnUse'>
      {renderShape(shapeId, { fill: 'white', stroke: 'none' })}
      {variant === 'neon-fade-shadow' && renderShape(shapeId, { fill: 'none', stroke: 'black', strokeWidth: 2.5 })}
    </mask>
  );

  const innerShadowFilter = variant === 'neon-fade-shadow' && (
    <filter id={innerShadowFilterId} x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur in='SourceGraphic' stdDeviation='1' result='blur' />
      <feMerge>
        <feMergeNode in='blur' />
        <feMergeNode in='SourceGraphic' />
      </feMerge>
    </filter>
  );

  const strokeGradient = variant === 'gradient-stroke' && (
    <linearGradient id={strokeGradId} x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stopColor='#ffffff' stopOpacity='0.9' />
      <stop offset='50%' stopColor={c.stroke} />
      <stop offset='100%' stopColor='#000000' stopOpacity='0.4' />
    </linearGradient>
  );

  let layers = null;
  const baseFill = { fill: `url(#${gradId})`, stroke: c.stroke };
  const noFill = { fill: 'none', stroke: c.stroke };

  switch (variant) {
    case 'edge-heavy':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, strokeWidth: 3 })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 1, opacity: 0.5 })}
        </>
      );
      break;
    case 'neon':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, strokeWidth: 4, filter: `url(#${glowId})` })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 1.5, opacity: 0.9 })}
        </>
      );
      break;
    case 'neon-fade':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, stroke: 'none' })}
          {renderShape(shapeId, { fill: 'none', stroke: c.stroke, strokeWidth: 1, filter: `url(#${glowId})` })}
        </>
      );
      break;
    case 'neon-fade-shadow':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, stroke: 'none' })}
          <g mask={`url(#${innerShadowMaskId})`}>
            {renderShape(shapeId, {
              fill: 'none',
              stroke: darkenHex(c.stroke, 0.15),
              strokeWidth: 5,
              filter: `url(#${innerShadowFilterId})`,
              opacity: 0.8,
            })}
          </g>
          {renderShape(shapeId, { fill: 'none', stroke: c.stroke, strokeWidth: 1.5, filter: `url(#${glowId})` })}
        </>
      );
      break;
    case 'neon-fade-shadow-alt':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, stroke: 'none' })}
          <g mask={`url(#${innerShadowMaskId})`}>
            {renderShape(shapeId, {
              fill: 'none',
              stroke: darkenHex(c.stroke, 0.2),
              strokeWidth: 3,
              filter: `url(#${innerShadowFilterId})`,
              opacity: 0.95,
            })}
          </g>
          {renderShape(shapeId, { fill: 'none', stroke: c.stroke, strokeWidth: 1, filter: `url(#${glowId})` })}
        </>
      );
      break;
    case 'neon-fade-no-shadow':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, stroke: 'none' })}
          {renderShape(shapeId, { fill: 'none', stroke: c.stroke, strokeWidth: 1.5, filter: `url(#${glowId})` })}
        </>
      );
      break;
    case 'dashed':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, strokeWidth: 3, strokeDasharray: '10 8' })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 1, opacity: 0.4 })}
        </>
      );
      break;
    case 'double':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, strokeWidth: 5, opacity: 0.25 })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 2 })}
        </>
      );
      break;
    case 'outline':
      layers = (
        <>
          {renderShape(shapeId, { ...noFill, strokeWidth: 2.5 })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 6, opacity: 0.12 })}
        </>
      );
      break;
    case 'soft':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, stroke: 'none' })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 1, opacity: 0.35 })}
        </>
      );
      break;
    case 'pulse':
      layers = (
        <>
          <g className='zone-style-pulse'>
            {renderShape(shapeId, { ...baseFill, strokeWidth: 3, filter: `url(#${glowId})` })}
          </g>
          {renderShape(shapeId, { ...noFill, strokeWidth: 1, opacity: 0.5 })}
        </>
      );
      break;
    case 'dotted':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, strokeWidth: 3, strokeDasharray: '3 6' })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 1, opacity: 0.4 })}
        </>
      );
      break;
    case 'gradient-stroke':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, stroke: `url(#${strokeGradId})`, strokeWidth: 3 })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 1, opacity: 0.4 })}
        </>
      );
      break;
    case 'glass':
      layers = (
        <>
          {renderShape(shapeId, { ...baseFill, strokeWidth: 2, opacity: 0.9 })}
          {renderShape(shapeId, { ...noFill, strokeWidth: 1, opacity: 0.35 })}
        </>
      );
      break;
    default:
      layers = renderShape(shapeId, { ...baseFill, strokeWidth: 3 });
  }

  return (
    <svg viewBox='0 0 360 290' className={className} preserveAspectRatio='xMidYMid meet'>
      <defs>
        {fillGradient}
        {glowFilter}
        {innerShadowMask}
        {innerShadowFilter}
        {strokeGradient}
      </defs>

      {showGrid && (
        <g className='zone-style-grid-lines'>
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v${i}`} x1={40 + i * 35} y1='20' x2={40 + i * 35} y2='270' />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h${i}`} x1='20' y1={35 + i * 40} x2='340' y2={35 + i * 40} />
          ))}
        </g>
      )}

      <g>
        {layers}
        {showCenter && <circle cx={cx} cy={cy} r='4' fill='#ffffff' opacity='0.9' />}
      </g>
    </svg>
  );
}

function StyleChip({ variant, active, onClick }) {
  return (
    <button
      type='button'
      className={`zone-style-chip ${active ? 'zone-style-chip--active' : ''}`}
      onClick={onClick}
      title={VARIANTS[variant]}
    >
      {VARIANTS[variant]}
    </button>
  );
}

function ColorSwatch({ colorKey, active, onClick }) {
  return (
    <button
      type='button'
      className={`zone-color-swatch ${active ? 'zone-color-swatch--active' : ''}`}
      onClick={onClick}
      aria-label={COLORS[colorKey].label}
      style={{ '--swatch-color': COLORS[colorKey].stroke }}
    />
  );
}

function ShapeCard({ shapeId, config, selected, onSelect, onChangeStyle, onChangeColor }) {
  const svgKey = `card-${shapeId}-${config.style}-${config.color}`;

  return (
    <div
      className={`zone-shape-card ${selected ? 'zone-shape-card--selected' : ''}`}
      onClick={() => onSelect(shapeId)}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(shapeId);
      }}
    >
      <div className='zone-shape-card__grid'>
        <ZoneSvg
          shapeId={shapeId}
          colorKey={config.color}
          variant={config.style}
          svgKey={svgKey}
          className='zone-shape-card__svg'
        />
      </div>
      <div className='zone-shape-card__body'>
        <div className='zone-shape-card__header'>
          <span className='zone-shape-card__name'>{SHAPE_LABELS[shapeId]}</span>
          <span className='zone-shape-card__style'>{VARIANTS[config.style]}</span>
        </div>

        <div className='zone-shape-card__control-row'>
          <span className='zone-shape-card__control-label'>Style</span>
          <div className='zone-shape-card__chips'>
            {VARIANT_KEYS.map((v) => (
              <StyleChip
                key={v}
                variant={v}
                active={config.style === v}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStyle(shapeId, v);
                }}
              />
            ))}
          </div>
        </div>

        <div className='zone-shape-card__control-row'>
          <span className='zone-shape-card__control-label'>Color</span>
          <div className='zone-shape-card__swatches'>
            {COLOR_KEYS.map((c) => (
              <ColorSwatch
                key={c}
                colorKey={c}
                active={config.color === c}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeColor(shapeId, c);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ZoneStylesTrialPage() {
  const [configs, setConfigs] = useState(DEFAULT_CONFIGS);
  const [selectedShapeId, setSelectedShapeId] = useState('hexagon');

  const selectedConfig = configs[selectedShapeId];

  const handleStyleChange = (shapeId, style) => {
    setConfigs((prev) => ({ ...prev, [shapeId]: { ...prev[shapeId], style } }));
    setSelectedShapeId(shapeId);
  };

  const handleColorChange = (shapeId, color) => {
    setConfigs((prev) => ({ ...prev, [shapeId]: { ...prev[shapeId], color } }));
    setSelectedShapeId(shapeId);
  };

  const applyAll = (key, value) => {
    setConfigs((prev) =>
      Object.fromEntries(Object.keys(prev).map((id) => [id, { ...prev[id], [key]: value }]))
    );
  };

  return (
    <div className='zone-styles-page'>
      <header className='zone-styles-header'>
        <h1 className='zone-styles-title'>Zone style laboratory</h1>
        <p className='zone-styles-subtitle'>
          Mix any shape with any style and color. The stage reflects the selected card.
        </p>
      </header>

      <section className='zone-styles-stage' aria-label='Selected preview'>
        <div className='zone-styles-stage__grid'>
          <ZoneSvg
            shapeId={selectedShapeId}
            colorKey={selectedConfig.color}
            variant={selectedConfig.style}
            svgKey='stage'
            className='zone-styles-stage__svg'
            showGrid
          />
        </div>
        <div className='zone-styles-stage__details'>
          <span className='zone-styles-stage__label'>Selected preview</span>
          <h2 className='zone-styles-stage__name'>{SHAPE_LABELS[selectedShapeId]}</h2>
          <p className='zone-styles-stage__desc'>
            {VARIANTS[selectedConfig.style]} · {COLORS[selectedConfig.color].label}
          </p>

          <div className='zone-styles-stage__controls'>
            <div className='zone-styles-stage__control-group'>
              <span className='zone-styles-stage__control-label'>Apply style to all</span>
              <div className='zone-styles-stage__chips'>
                {VARIANT_KEYS.map((v) => (
                  <StyleChip
                    key={v}
                    variant={v}
                    active={selectedConfig.style === v}
                    onClick={() => applyAll('style', v)}
                  />
                ))}
              </div>
            </div>
            <div className='zone-styles-stage__control-group'>
              <span className='zone-styles-stage__control-label'>Apply color to all</span>
              <div className='zone-styles-stage__swatches'>
                {COLOR_KEYS.map((c) => (
                  <ColorSwatch
                    key={c}
                    colorKey={c}
                    active={selectedConfig.color === c}
                    onClick={() => applyAll('color', c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='zone-styles-gallery' aria-label='Shape options'>
        {Object.keys(SHAPES).map((shapeId) => (
          <ShapeCard
            key={shapeId}
            shapeId={shapeId}
            config={configs[shapeId]}
            selected={selectedShapeId === shapeId}
            onSelect={setSelectedShapeId}
            onChangeStyle={handleStyleChange}
            onChangeColor={handleColorChange}
          />
        ))}
      </section>
    </div>
  );
}
