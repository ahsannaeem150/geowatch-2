import React from 'react';
import { Skeleton } from './Skeleton.jsx';
import SummaryCard from './incident-detail/SummaryCard.jsx';
import './zone/ZoneTrial.css';
import './zone/ZoneHeroesTrial.css';

function BadgeRow({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={[92, 68, 82, 58, 70][i % 5]} height="21px" style={{ borderRadius: 'var(--radius-pill)' }} />
      ))}
    </div>
  );
}

function TextLines({ lines = 3, lastWidth = '62%', height = '12px' }) {
  return (
    <div>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={height} width={i === lines - 1 ? lastWidth : `${94 - (i % 2) * 8}%`} style={{ marginBottom: 9 }} />
      ))}
    </div>
  );
}

function MediaGrid({ count = 4, height = 76 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={`${height}px`} style={{ borderRadius: 'var(--radius-md)' }} />
      ))}
    </div>
  );
}

function PanelHeader({ label }) {
  return (
    <div style={{ height: 38, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
      <Skeleton height="10px" width={label === 'zone' ? '82px' : '104px'} />
    </div>
  );
}

function IncidentTimelineItem({ first = false, last = false, children }) {
  return (
    <div className="id-timeline-item">
      <div className="id-timeline-spine">
        {!first && <div className="id-timeline-line" />}
        <div className={`id-timeline-dot ${first ? 'id-timeline-dot--latest' : ''}`} />
        {!last && <div className="id-timeline-line" />}
      </div>
      <div className="id-timeline-content">{children}</div>
    </div>
  );
}

function UpdateHeaderSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <Skeleton height="11px" width="44%" />
      <Skeleton height="19px" width="66px" style={{ borderRadius: 'var(--radius-pill)' }} />
    </div>
  );
}

function IncidentUpdateSkeleton({ latest = false, media = false, post = false, last = false }) {
  const content = (
    <>
      <UpdateHeaderSkeleton />
      <Skeleton height="17px" width="88%" style={{ marginBottom: 8 }} />
      <Skeleton height="17px" width="64%" style={{ marginBottom: 12 }} />
      <TextLines lines={1} lastWidth="78%" />
      <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <Skeleton height="11px" width="30%" style={{ marginBottom: 12 }} />
        {media ? <MediaGrid count={4} height={124} /> : null}
        {post ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <Skeleton width="30px" height="30px" style={{ borderRadius: '50%' }} />
              <Skeleton height="11px" width="42%" />
            </div>
            <TextLines lines={3} lastWidth="68%" />
            <Skeleton height="210px" style={{ marginTop: 10, borderRadius: 'var(--radius-md)' }} />
          </>
        ) : null}
        {!media && !post ? <Skeleton height="170px" style={{ borderRadius: 'var(--radius-md)' }} /> : null}
      </div>
    </>
  );
  return (
    <IncidentTimelineItem first={latest} last={last}>
      {latest ? <div className="id-latest">{content}</div> : <div className="id-update-card"><div className="id-update-card__body">{content}</div></div>}
    </IncidentTimelineItem>
  );
}

export function IncidentSidebarSkeleton({ incident = null }) {
  const summary = incident ? {
    ...incident,
    domain: incident.domain || incident.domain_name,
    domainColor: incident.domainColor || incident.domain_color,
    categoryName: incident.categoryName || incident.category_name,
    categoryColor: incident.categoryColor || incident.category_color || incident.domain_color,
    verification: incident.verification || incident.verification_status,
    locationContext: incident.locationContext || incident.location_context,
    startDate: incident.startDate || incident.start_date,
  } : null;

  return (
    <aside className="id-sidebar" role="status" aria-label="Loading incident details" aria-busy="true">
      <PanelHeader label="incident" />
      <div className="id-sidebar__scroll">
        {summary ? (
          <SummaryCard incident={summary}>
            <div className="id-summary__actions">
              <Skeleton height="38px" width="126px" />
              <Skeleton height="38px" width="154px" />
            </div>
          </SummaryCard>
        ) : (
          <div className="id-summary" style={{ minHeight: 466 }}>
            <div className="id-summary__row"><BadgeRow /></div>
            <div className="id-summary__title-row">
              <div style={{ flex: 1 }}>
                <Skeleton height="24px" width="94%" style={{ marginBottom: 7 }} />
                <Skeleton height="24px" width="66%" />
              </div>
              <Skeleton width="16px" height="16px" />
            </div>
            <div className="id-summary__meta">
              <Skeleton height="12px" width="42%" />
              <Skeleton height="12px" width="34%" />
            </div>
            <div className="id-summary__desc"><TextLines lines={9} lastWidth="72%" /></div>
            <div className="id-summary__actions">
              <Skeleton height="38px" width="126px" />
              <Skeleton height="38px" width="154px" />
            </div>
          </div>
        )}
        <div className="id-section-title"><Skeleton height="19px" width="94px" /></div>
        <IncidentUpdateSkeleton latest media />
        <div className="id-section-title"><Skeleton height="19px" width="62px" /></div>
        <IncidentUpdateSkeleton post />
        <IncidentUpdateSkeleton media last />
      </div>
    </aside>
  );
}

function ZoneTimelineSkeleton({ first = false, last = false, media = false, rail = false }) {
  return (
    <div className="zone-timeline-event">
      <div className="zone-timeline-event__line">
        <div className={`zone-timeline-event__dot ${first ? 'zone-timeline-event__dot--active' : ''}`} />
        {!last && <div className="zone-timeline-event__stem" />}
      </div>
      <div className={`zone-timeline-event__content zone-timeline-event--clickable ${rail ? 'zone-timeline-event--rail' : ''}`} style={rail ? { minHeight: 208 } : first ? { minHeight: 162 } : undefined}>
        <div className="zone-timeline-event__top">
          <Skeleton height="12px" width="38%" />
          <Skeleton height="19px" width="66px" style={{ borderRadius: 'var(--radius-pill)' }} />
        </div>
        <Skeleton height="16px" width="88%" style={{ marginBottom: 8 }} />
        <Skeleton height="16px" width="62%" style={{ marginBottom: 12 }} />
        <TextLines lines={1} lastWidth="76%" />
        {media ? <div style={{ marginTop: 12 }}><MediaGrid count={2} height={78} /></div> : (
          <div style={{ marginTop: 14 }}><Skeleton height="12px" width="36%" /></div>
        )}
      </div>
    </div>
  );
}

export function ZoneSidebarSkeleton() {
  return (
    <aside className="zone-detail-sidebar" role="status" aria-label="Loading zone details" aria-busy="true">
      <PanelHeader label="zone" />
      <div className="zone-sidebar-scroll">
        <div className="zone-summary" style={{ minHeight: 572 }}>
          <div className="zone-badge-row"><BadgeRow count={4} /></div>
          <Skeleton height="24px" width="94%" style={{ margin: '16px 0 7px' }} />
          <Skeleton height="24px" width="64%" style={{ marginBottom: 16 }} />
          <div className="zone-meter">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
              <Skeleton height="13px" width="28%" />
              <Skeleton height="13px" width="34%" />
            </div>
            <Skeleton height="4px" style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <Skeleton height="10px" width="26%" />
              <Skeleton height="10px" width="24%" />
            </div>
          </div>
          <div className="zone-stats-grid" style={{ marginBottom: 18 }}>
            {[0, 1, 2].map((i) => (
              <div className="zone-stat" key={i}>
                <Skeleton height="24px" width="54%" style={{ margin: '0 auto 8px' }} />
                <Skeleton height="10px" width="68%" style={{ margin: '0 auto' }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}><TextLines lines={9} lastWidth="70%" /></div>
          <Skeleton height="12px" width="44%" style={{ marginBottom: 18 }} />
          <div className="zone-actions">
            <Skeleton height="38px" width="108px" />
            <Skeleton height="38px" width="86px" />
            <Skeleton height="38px" width="80px" />
          </div>
        </div>
        <div className="zone-section-title zone-section-title--timeline"><Skeleton height="22px" width="138px" /></div>
        <div className="zone-timeline">
          <ZoneTimelineSkeleton first />
          <ZoneTimelineSkeleton media />
          <ZoneTimelineSkeleton media last />
        </div>
      </div>
    </aside>
  );
}

function IncidentEvidenceSkeleton() {
  return (
    <div className="opt1-rail">
      <div className="opt1-rail-header">
        <Skeleton height="20px" width="68%" style={{ marginBottom: 8 }} />
        <Skeleton height="11px" width="44%" />
      </div>
      <div className="opt1-rail-card" style={{ padding: 16 }}>
        <Skeleton height="12px" width="28%" style={{ marginBottom: 12 }} />
        <Skeleton height="207px" style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height="24px" width={`${18 + i * 3}%`} />)}
        </div>
        <MediaGrid count={4} height={92} />
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <Skeleton width="30px" height="30px" style={{ borderRadius: '50%' }} />
            <Skeleton height="11px" width="42%" />
          </div>
          <TextLines lines={3} lastWidth="68%" />
          <Skeleton height="138px" style={{ marginTop: 10, borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    </div>
  );
}

function IncidentPageEvent({ index }) {
  return (
    <div className={`opt1-event ${index === 0 ? 'opt1-event--active' : ''}`} style={index === 0 ? { minHeight: 182 } : undefined}>
      <div className="opt1-event-dot" />
      <Skeleton height="10px" width="28%" style={{ marginBottom: 10 }} />
      <div className="opt1-event-head">
        <Skeleton height="11px" width="42%" />
        <Skeleton height="18px" width="62px" style={{ borderRadius: 'var(--radius-pill)' }} />
      </div>
      <Skeleton height="19px" width={index === 0 ? '90%' : '82%'} style={{ marginBottom: 8 }} />
      {index === 0 && <Skeleton height="19px" width="62%" style={{ marginBottom: 8 }} />}
      <TextLines lines={index === 0 ? 1 : 2} lastWidth="68%" />
    </div>
  );
}

export function IncidentDetailSkeleton() {
  return (
    <div className="option1-root option1-root--user" role="status" aria-label="Loading incident page" aria-busy="true" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="opt1-topbar">
        <div className="opt1-topbar-inner">
          <div className="opt1-topbar-left" style={{ gap: 14 }}>
            <Skeleton height="28px" width="70px" />
            <Skeleton height="13px" width="360px" />
            <Skeleton height="20px" width="74px" style={{ borderRadius: 'var(--radius-pill)' }} />
          </div>
        </div>
      </div>
      <main className="opt1-main">
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 80px' }}>
          <div className="opt1-hero" style={{ minHeight: 381 }}>
            <div className="opt1-hero-content">
              <div className="opt1-hero-meta" style={{ gap: 10, marginBottom: 18 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="11px" width={`${10 + (i % 3) * 4}%`} />)}
              </div>
              <Skeleton height="48px" width="72%" style={{ marginBottom: 8 }} />
              <Skeleton height="48px" width="54%" style={{ marginBottom: 18 }} />
              <div style={{ maxWidth: 760 }}><TextLines lines={5} lastWidth="58%" /></div>
            </div>
          </div>
          <div className="opt1-section-title"><Skeleton height="21px" width="142px" /></div>
          <div className="opt1-grid">
            <div className="opt1-timeline">
              <div className="opt1-timeline-track" />
              {[0, 1, 2, 3].map((i) => <IncidentPageEvent key={i} index={i} />)}
            </div>
            <IncidentEvidenceSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}

function ZoneEvidenceSkeleton() {
  return (
    <div className="zone-evidence-rail">
      <Skeleton height="18px" width="40%" style={{ marginBottom: 2 }} />
      <div className="zone-evidence-rail__card">
        <div className="zone-evidence-rail__header">
          <div style={{ flex: 1 }}>
            <Skeleton height="17px" width="84%" style={{ marginBottom: 7 }} />
            <Skeleton height="17px" width="58%" style={{ marginBottom: 9 }} />
            <Skeleton height="10px" width="46%" />
          </div>
          <Skeleton height="19px" width="66px" style={{ borderRadius: 'var(--radius-pill)' }} />
        </div>
        <div style={{ padding: 16 }}>
          <Skeleton height="12px" width="26%" style={{ marginBottom: 12 }} />
          <div style={{ padding: 14, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <Skeleton width="30px" height="30px" style={{ borderRadius: '50%' }} />
              <Skeleton height="11px" width="42%" />
            </div>
            <TextLines lines={4} lastWidth="70%" />
            <Skeleton height="164px" style={{ marginTop: 10, borderRadius: 'var(--radius-md)' }} />
          </div>
          <Skeleton height="11px" width="30%" style={{ marginBottom: 12 }} />
          <div style={{ padding: 14, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
            <Skeleton height="14px" width="86%" style={{ marginBottom: 9 }} />
            <TextLines lines={2} lastWidth="64%" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <Skeleton height="32px" width="46%" />
            <Skeleton height="32px" width="46%" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ZoneDetailSkeleton() {
  return (
    <div className="zone-full-page" role="status" aria-label="Loading zone page" aria-busy="true">
      <div className="zd-topbar">
        <div className="zd-topbar__left" style={{ gap: 14 }}>
          <Skeleton height="28px" width="70px" />
          <Skeleton height="13px" width="360px" />
        </div>
      </div>
      <section className="zh-hero zone-layout-b__hero--hud">
        <div className="zh-hero__top-hud">
          <Skeleton height="28px" width="104px" />
          <Skeleton height="28px" width="230px" />
        </div>
        <div className="zh-hero__side-hud zh-hero__side-hud--left">
          {[0, 1].map((i) => <Skeleton key={i} height="42px" />)}
        </div>
        <div className="zh-hero__side-hud zh-hero__side-hud--right">
          {[0, 1].map((i) => <Skeleton key={i} height="42px" />)}
        </div>
        <div className="zh-hero__center-hud" style={{ minHeight: 'min(549px, 62vh)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Skeleton height="54px" width="82%" style={{ margin: '0 auto 7px' }} />
          <Skeleton height="54px" width="68%" style={{ margin: '0 auto 7px' }} />
          <Skeleton height="54px" width="42%" style={{ margin: '0 auto 20px' }} />
          <div style={{ width: '88%', margin: '0 auto 22px' }}><TextLines lines={5} lastWidth="64%" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} height="64px" />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <Skeleton height="34px" width="116px" />
            <Skeleton height="34px" width="96px" />
          </div>
        </div>
      </section>
      <div className="zone-layout-b__body zone-layout-b__body--rail">
        <div className="zone-full-timeline zone-full-timeline--rail">
          <Skeleton height="21px" width="46%" />
          <ZoneTimelineSkeleton first rail />
          <ZoneTimelineSkeleton rail />
          <ZoneTimelineSkeleton rail last />
        </div>
        <ZoneEvidenceSkeleton />
      </div>
    </div>
  );
}
