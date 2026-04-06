import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

export default function LazyBoundary({ children, fallback = null }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
