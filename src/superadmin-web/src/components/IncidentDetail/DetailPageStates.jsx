import React from 'react';
import { ErrorState } from '@shared/components/AsyncStates.jsx';
import { IncidentDetailSkeleton, ZoneDetailSkeleton } from '@shared/components/DetailSkeletons.jsx';

export function DetailLoadingSkeleton({ kind = 'incident' }) {
  return kind === 'zone' ? <ZoneDetailSkeleton /> : <IncidentDetailSkeleton />;
}

export function DetailErrorState(props) {
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 24px' }}>
      <ErrorState variant="page" {...props} />
    </div>
  );
}
