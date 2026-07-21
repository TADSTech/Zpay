import type { ReactNode } from 'react';
import { useTilt } from '../hooks/useTilt';

interface TiltCardProps {
  className?: string;
  children: ReactNode;
  /** Max tilt in degrees (restrained: 3–6). */
  maxTilt?: number;
}

/**
 * Wraps content in a surface that gently tilts toward the cursor on hover.
 * Motion is gated by `useTilt` (disabled for reduced-motion / touch).
 */
export default function TiltCard({ className, children, maxTilt = 5 }: TiltCardProps) {
  const tilt = useTilt<HTMLDivElement>(maxTilt);
  return (
    <div className={className} {...tilt}>
      {children}
    </div>
  );
}
