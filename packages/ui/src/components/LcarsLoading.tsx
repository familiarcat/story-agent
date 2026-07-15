'use client';

interface LcarsLoadingProps {
  scope: 'screen' | 'component';
  source: string;
  destination?: string;
  summary?: string;
}

export function LcarsLoading({ scope, source, destination, summary }: LcarsLoadingProps) {
  const headline = destination ? `Loading ${destination}` : `Loading ${source}`;
  const detail = summary ?? (destination
    ? `Preparing destination context for ${destination}.`
    : `Syncing ${source} components and view state.`);

  return (
    <section className={`lcars-loading lcars-loading--${scope}`} role="status" aria-live="polite" aria-busy="true">
      <div className="lcars-loading__rail" aria-hidden>
        <span className="lcars-loading__chip lcars-loading__chip--a" />
        <span className="lcars-loading__chip lcars-loading__chip--b" />
        <span className="lcars-loading__chip lcars-loading__chip--c" />
      </div>

      <div className="lcars-loading__body">
        <p className="lcars-loading__kicker">ASYNC VIEW STATE</p>
        <h2 className="lcars-loading__title">{headline}</h2>
        <p className="lcars-loading__detail">{detail}</p>

        <div className="lcars-loading__equalizer" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
