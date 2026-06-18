import React, { useMemo } from 'react';
import './ZoneTrialMeter.css';
import { format } from 'date-fns';
import { MOCK_ZONE } from './zoneTrialData.js';
import { EffectiveWindowMeter, useZoneTimeState } from './ZoneTrialCommon.jsx';
import { Calendar, Hourglass, Terminal, ArrowRight } from 'lucide-react';

function formatDurationCompact(ms) {
  if (ms == null || ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours && parts.length < 2) parts.push(`${hours}h`);
  if (minutes && parts.length < 2) parts.push(`${minutes}m`);
  if (!days && !hours && parts.length < 2) parts.push(`${seconds}s`);
  return parts.slice(0, 2).join(' ') || '< 1m';
}

function useMeterState(startDate, endDate) {
  const state = useZoneTimeState(startDate, endDate);
  const color =
    state.state === 'active' || state.state === 'indefinite'
      ? '#22c55e'
      : state.state === 'upcoming'
      ? '#3b82f6'
      : '#6b7280';
  const statusLabel =
    state.state === 'active'
      ? 'Active'
      : state.state === 'upcoming'
      ? 'Upcoming'
      : state.state === 'expired'
      ? 'Expired'
      : 'Indefinite';
  const countdown =
    state.state === 'upcoming'
      ? `Starts in ${formatDurationCompact(state.remainingMs)}`
      : state.state === 'active' && state.end
      ? `${formatDurationCompact(state.remainingMs)} remaining`
      : state.state === 'indefinite'
      ? 'Until further notice'
      : state.state === 'expired'
      ? 'Ended'
      : state.relative;
  return {
    ...state,
    color,
    statusLabel,
    countdown,
    startLabel: state.start ? format(state.start, 'MMM d, h:mm a') : '—',
    endLabel: state.end ? format(state.end, 'MMM d, h:mm a') : 'No expiry',
  };
}

function MeterCard({ title, children, number }) {
  return (
    <div className="meter-card">
      <div className="meter-card__header">
        <span className="meter-card__num">{String(number).padStart(2, '0')}</span>
        <span className="meter-card__title">{title}</span>
      </div>
      <div className="meter-card__body">{children}</div>
    </div>
  );
}

/* ───────── 01. Classic ───────── */
function MeterClassic() {
  return <EffectiveWindowMeter startDate={MOCK_ZONE.startDate} endDate={MOCK_ZONE.endDate} />;
}

/* ───────── 02. Badge ───────── */
function MeterBadge({ data }) {
  return (
    <div className="meter-badge" style={{ borderColor: `${data.color}40`, background: `${data.color}10` }}>
      <span className="meter-badge__dot" style={{ background: data.color }} />
      <span className="meter-badge__status" style={{ color: data.color }}>
        {data.statusLabel}
      </span>
      <span className="meter-badge__countdown">{data.countdown}</span>
    </div>
  );
}

/* ───────── 03. Ring ───────── */
function MeterRing({ data }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (data.remainingProgress / 100) * circumference;
  return (
    <div className="meter-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={data.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="meter-ring__text">
        <div className="meter-ring__countdown">{data.countdown}</div>
        <div className="meter-ring__status" style={{ color: data.color }}>
          {data.statusLabel}
        </div>
      </div>
    </div>
  );
}

/* ───────── 04. Segmented ───────── */
function MeterSegmented({ data }) {
  const segments = 12;
  const filled = Math.round((data.remainingProgress / 100) * segments);
  return (
    <div className="meter-segmented">
      <div className="meter-segmented__top">
        <span style={{ color: data.color }}>{data.statusLabel}</span>
        <span>{data.countdown}</span>
      </div>
      <div className="meter-segmented__grid">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="meter-segmented__cell"
            style={i < filled ? { background: data.color, opacity: 0.8 + i * 0.02 } : {}}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────── 05. Blocks ───────── */
function MeterBlocks({ data }) {
  const ms = data.remainingMs || 0;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const blocks = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Mins', value: minutes },
    { label: 'Secs', value: seconds },
  ];
  return (
    <div className="meter-blocks">
      {blocks.map((b) => (
        <div key={b.label} className="meter-blocks__block" style={{ borderColor: `${data.color}30` }}>
          <div className="meter-blocks__value" style={{ color: data.color }}>
            {String(b.value).padStart(2, '0')}
          </div>
          <div className="meter-blocks__label">{b.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ───────── 06. Timeline ───────── */
function MeterTimeline({ data }) {
  return (
    <div className="meter-timeline">
      <div className="meter-timeline__labels">
        <span>{data.startLabel}</span>
        <span style={{ color: data.color }}>{data.statusLabel}</span>
        <span>{data.endLabel}</span>
      </div>
      <div className="meter-timeline__track">
        <div className="meter-timeline__fill" style={{ width: `${data.elapsedProgress}%`, background: data.color }} />
        <div
          className="meter-timeline__knob"
          style={{ left: `${data.elapsedProgress}%`, background: data.color }}
        />
      </div>
      <div className="meter-timeline__countdown" style={{ color: data.color }}>
        {data.countdown}
      </div>
    </div>
  );
}

/* ───────── 07. Battery ───────── */
function MeterBattery({ data }) {
  return (
    <div className="meter-battery">
      <div className="meter-battery__body">
        <div
          className="meter-battery__fill"
          style={{ width: `${data.remainingProgress}%`, background: data.color }}
        />
        <span className="meter-battery__text">{data.countdown}</span>
      </div>
      <div className="meter-battery__cap" />
    </div>
  );
}

/* ───────── 08. Dashboard tile ───────── */
function MeterDashboard({ data }) {
  return (
    <div className="meter-dashboard">
      <div className="meter-dashboard__label" style={{ color: data.color }}>
        {data.statusLabel}
      </div>
      <div className="meter-dashboard__value">{data.countdown}</div>
      <div className="meter-dashboard__bar">
        <div style={{ width: `${data.remainingProgress}%`, background: data.color }} />
      </div>
    </div>
  );
}

/* ───────── 09. Arrow ───────── */
function MeterArrow({ data }) {
  return (
    <div className="meter-arrow">
      <div className="meter-arrow__track">
        <div className="meter-arrow__fill" style={{ width: `${data.remainingProgress}%`, background: data.color }} />
      </div>
      <div className="meter-arrow__head" style={{ borderLeftColor: data.color }} />
      <div className="meter-arrow__text">
        <span style={{ color: data.color }}>{data.statusLabel}</span>
        <span>{data.countdown}</span>
      </div>
    </div>
  );
}

/* ───────── 10. Pulse dot ───────── */
function MeterPulse({ data }) {
  return (
    <div className="meter-pulse">
      <span className="meter-pulse__dot" style={{ background: data.color }} />
      <div>
        <div className="meter-pulse__status" style={{ color: data.color }}>
          {data.statusLabel}
        </div>
        <div className="meter-pulse__countdown">{data.countdown}</div>
      </div>
    </div>
  );
}

/* ───────── 11. Digits ───────── */
function MeterDigits({ data }) {
  return (
    <div className="meter-digits">
      <div className="meter-digits__screen">
        <span className="meter-digits__status" style={{ color: data.color }}>
          {data.statusLabel}
        </span>
        <span className="meter-digits__time">{formatDurationCompact(data.remainingMs) || '—'}</span>
      </div>
      <div className="meter-digits__bar">
        <div style={{ width: `${data.remainingProgress}%`, background: data.color }} />
      </div>
    </div>
  );
}

/* ───────── 12. Calendar ───────── */
function MeterCalendar({ data }) {
  return (
    <div className="meter-calendar">
      <div className="meter-calendar__icon" style={{ color: data.color }}>
        <Calendar size={28} />
      </div>
      <div className="meter-calendar__body">
        <div className="meter-calendar__status" style={{ color: data.color }}>
          {data.statusLabel}
        </div>
        <div className="meter-calendar__countdown">{data.countdown}</div>
        <div className="meter-calendar__date">
          {data.startLabel} <ArrowRight size={12} /> {data.endLabel || 'No expiry'}
        </div>
      </div>
    </div>
  );
}

/* ───────── 13. Donut ───────── */
function MeterDonut({ data }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const remainingDash = (data.remainingProgress / 100) * circumference;
  const elapsedDash = (data.elapsedProgress / 100) * circumference;
  return (
    <div className="meter-donut">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={data.color}
          strokeWidth="10"
          strokeDasharray={`${remainingDash} ${circumference}`}
          transform="rotate(-90 55 55)"
          opacity="0.35"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={data.color}
          strokeWidth="10"
          strokeDasharray={`${elapsedDash} ${circumference}`}
          transform="rotate(-90 55 55)"
          strokeLinecap="round"
        />
      </svg>
      <div className="meter-donut__text">
        <div style={{ color: data.color }}>{data.statusLabel}</div>
        <div>{data.countdown}</div>
      </div>
    </div>
  );
}

/* ───────── 14. Minimal ───────── */
function MeterMinimal({ data }) {
  return (
    <div className="meter-minimal">
      <div className="meter-minimal__row">
        <span style={{ color: data.color }}>{data.statusLabel}</span>
        <span>{data.countdown}</span>
      </div>
      <div className="meter-minimal__track">
        <div style={{ width: `${data.remainingProgress}%`, background: data.color }} />
      </div>
      <div className="meter-minimal__dates">
        <span>{data.startLabel}</span>
        <span>{data.endLabel}</span>
      </div>
    </div>
  );
}

/* ───────── 15. Gantt ───────── */
function MeterGantt({ data }) {
  return (
    <div className="meter-gantt">
      <div className="meter-gantt__header">
        <span>{data.startLabel}</span>
        <span>{data.endLabel}</span>
      </div>
      <div className="meter-gantt__bar">
        <div className="meter-gantt__elapsed" style={{ width: `${data.elapsedProgress}%`, background: 'rgba(255,255,255,0.12)' }} />
        <div className="meter-gantt__remaining" style={{ width: `${data.remainingProgress}%`, background: data.color }} />
        <div className="meter-gantt__marker" style={{ left: `${data.elapsedProgress}%`, background: data.color }} />
      </div>
      <div className="meter-gantt__footer" style={{ color: data.color }}>
        {data.statusLabel} · {data.countdown}
      </div>
    </div>
  );
}

/* ───────── 16. Thermometer ───────── */
function MeterThermometer({ data }) {
  return (
    <div className="meter-thermometer">
      <div className="meter-thermometer__track">
        <div className="meter-thermometer__fill" style={{ height: `${data.remainingProgress}%`, background: data.color }} />
      </div>
      <div className="meter-thermometer__text">
        <div style={{ color: data.color }}>{data.statusLabel}</div>
        <div>{data.countdown}</div>
      </div>
    </div>
  );
}

/* ───────── 17. Steps ───────── */
function MeterSteps({ data }) {
  const steps = 5;
  const active = Math.max(1, Math.round((data.remainingProgress / 100) * steps));
  return (
    <div className="meter-steps">
      <div className="meter-steps__labels">
        <span style={{ color: data.color }}>{data.statusLabel}</span>
        <span>{data.countdown}</span>
      </div>
      <div className="meter-steps__row">
        {Array.from({ length: steps }).map((_, i) => (
          <div
            key={i}
            className="meter-steps__pill"
            style={i < active ? { background: data.color } : {}}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────── 18. Hourglass ───────── */
function MeterHourglass({ data }) {
  return (
    <div className="meter-hourglass">
      <Hourglass size={28} style={{ color: data.color }} />
      <div>
        <div className="meter-hourglass__status" style={{ color: data.color }}>
          {data.statusLabel}
        </div>
        <div className="meter-hourglass__countdown">{data.countdown}</div>
      </div>
      <div className="meter-hourglass__bar">
        <div style={{ width: `${data.remainingProgress}%`, background: data.color }} />
      </div>
    </div>
  );
}

/* ───────── 19. Neon strip ───────── */
function MeterNeon({ data }) {
  return (
    <div className="meter-neon">
      <div className="meter-neon__bar" style={{ background: data.color, boxShadow: `0 0 20px ${data.color}` }}>
        <div className="meter-neon__dim" style={{ width: `${100 - data.remainingProgress}%` }} />
      </div>
      <div className="meter-neon__text">
        <span style={{ color: data.color }}>{data.statusLabel}</span>
        <span>{data.countdown}</span>
      </div>
    </div>
  );
}

/* ───────── 20. Terminal ───────── */
function MeterTerminal({ data }) {
  const barLen = 20;
  const filled = Math.round((data.remainingProgress / 100) * barLen);
  const bar = '[' + '█'.repeat(filled) + '░'.repeat(barLen - filled) + ']';
  return (
    <div className="meter-terminal">
      <Terminal size={18} style={{ color: data.color, flexShrink: 0 }} />
      <div>
        <div>
          <span style={{ color: data.color }}>$</span> status --{data.statusLabel.toLowerCase()}
        </div>
        <div className="meter-terminal__bar" style={{ color: data.color }}>
          {bar} {data.countdown}
        </div>
      </div>
    </div>
  );
}

export default function ZoneTrialMeterPage() {
  const data = useMeterState(MOCK_ZONE.startDate, MOCK_ZONE.endDate);

  const meters = useMemo(
    () => [
      { title: 'Classic', comp: <MeterClassic /> },
      { title: 'Status badge', comp: <MeterBadge data={data} /> },
      { title: 'Circular ring', comp: <MeterRing data={data} /> },
      { title: 'Segmented blocks', comp: <MeterSegmented data={data} /> },
      { title: 'Countdown blocks', comp: <MeterBlocks data={data} /> },
      { title: 'Timeline marker', comp: <MeterTimeline data={data} /> },
      { title: 'Battery level', comp: <MeterBattery data={data} /> },
      { title: 'Dashboard tile', comp: <MeterDashboard data={data} /> },
      { title: 'Arrow progress', comp: <MeterArrow data={data} /> },
      { title: 'Pulse dot', comp: <MeterPulse data={data} /> },
      { title: 'Digital digits', comp: <MeterDigits data={data} /> },
      { title: 'Calendar card', comp: <MeterCalendar data={data} /> },
      { title: 'Donut chart', comp: <MeterDonut data={data} /> },
      { title: 'Minimal line', comp: <MeterMinimal data={data} /> },
      { title: 'Gantt bar', comp: <MeterGantt data={data} /> },
      { title: 'Thermometer', comp: <MeterThermometer data={data} /> },
      { title: 'Step pills', comp: <MeterSteps data={data} /> },
      { title: 'Hourglass', comp: <MeterHourglass data={data} /> },
      { title: 'Neon strip', comp: <MeterNeon data={data} /> },
      { title: 'Terminal', comp: <MeterTerminal data={data} /> },
    ],
    [data]
  );

  return (
    <div className="zone-meter-page">
      <header className="zone-meter-page__header">
        <h1>Effective-window meter explorations</h1>
        <p>20 visual variations using the same zone time state. Pick the ones you like.</p>
      </header>
      <div className="zone-meter-page__grid">
        {meters.map((m, i) => (
          <MeterCard key={m.title} title={m.title} number={i + 1}>
            {m.comp}
          </MeterCard>
        ))}
      </div>
    </div>
  );
}
