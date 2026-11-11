import React, { useEffect, useState } from 'react';
import { Skeleton } from './Skeleton.jsx';
import { getNetworkSimulationMode, NETWORK_SIMULATION_DELAY_MS } from '../utils/networkSimulation.js';

export default function LoadingImage({ src, alt = '', style = {}, onLoad, onError, ...props }) {
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  const [delayedSrc, setDelayedSrc] = useState(getNetworkSimulationMode() === 'delay' ? '' : src);
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;

  useEffect(() => {
    if (getNetworkSimulationMode() !== 'delay') {
      setDelayedSrc(src);
      return undefined;
    }

    setDelayedSrc('');
    const timeout = setTimeout(() => setDelayedSrc(src), NETWORK_SIMULATION_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [src]);

  return (
    <span
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        height: '100%',
        minHeight: loaded || failed ? 0 : 80,
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      {!loaded && !failed ? (
        <Skeleton style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 0 }} />
      ) : null}
      <img
        {...props}
        src={delayedSrc}
        alt={alt}
        style={{ ...style, position: 'relative', zIndex: 1, opacity: loaded || failed ? 1 : 0 }}
        onLoad={(event) => {
          setLoadedSrc(src);
          onLoad?.(event);
        }}
        onError={(event) => {
          setFailedSrc(src);
          onError?.(event);
        }}
      />
    </span>
  );
}
