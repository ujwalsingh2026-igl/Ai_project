import React from 'react';
import { Shield, Clock, Construction, FileCode } from 'lucide-react';

interface PlannedPlaceholderProps {
  title: string;
  phase: string;
  description: string;
  plannedFeatures: string[];
  safetyBoundaries?: string[];
}

export const PlannedPlaceholderView: React.FC<PlannedPlaceholderProps> = ({
  title,
  phase,
  description,
  plannedFeatures,
  safetyBoundaries,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-cockpit-base font-sans p-4 md:p-6 space-y-6">
      {/* Top Banner */}
      <div className="border-b border-cockpit-border pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Construction className="w-5 h-5 text-severity-med" />
            <h1 className="font-mono text-base font-bold uppercase tracking-wider text-cockpit-text">
              {title}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-severity-med/20 border border-severity-med text-severity-med uppercase">
              PLANNED // {phase}
            </span>
          </div>
          <p className="text-xs font-mono text-cockpit-muted mt-1">
            {description}
          </p>
        </div>
      </div>

      {/* Honest Status Notice */}
      <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-cockpit-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cockpit-text">
              IMPLEMENTATION SCHEDULED FOR {phase}
            </h2>
            <p className="text-xs text-cockpit-muted leading-relaxed font-sans">
              To guarantee stability and test coverage, this component will be implemented incrementally in its designated phase. No simulated or mock data is rendered here to avoid presenting false security telemetry.
            </p>
          </div>
        </div>

        {/* Feature roadmap */}
        <div className="border-t border-cockpit-border pt-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cockpit-text mb-2.5 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cockpit-accent" />
            PLANNED CAPABILITIES
          </h3>
          <ul className="space-y-2 font-mono text-xs text-cockpit-muted">
            {plannedFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-cockpit-accent font-bold">›</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Safety Boundaries */}
        {safetyBoundaries && safetyBoundaries.length > 0 && (
          <div className="border-t border-cockpit-border pt-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-severity-high mb-2.5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-severity-high" />
              HARD DEFENSIVE BOUNDARIES ENFORCED
            </h3>
            <ul className="space-y-2 font-mono text-xs text-cockpit-muted">
              {safetyBoundaries.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-severity-high font-bold">■</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
