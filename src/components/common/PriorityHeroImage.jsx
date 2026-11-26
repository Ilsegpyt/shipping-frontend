import { useState } from "react";
import { LoadingSpinner } from "./LoadingScreen";

function HeroImage({ src, className }) {
  const [settled, setSettled] = useState(false);

  return (
    <>
      <img
        ref={(node) => { if (node?.complete) setSettled(true); }}
        src={src}
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        className={className}
        onLoad={() => setSettled(true)}
        onError={() => setSettled(true)}
      />
      {!settled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <LoadingSpinner small label="Loading hero image..." />
        </div>
      )}
    </>
  );
}

export default function PriorityHeroImage({ src, pending = false, className }) {
  if (pending) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <LoadingSpinner small label="Loading hero image..." />
      </div>
    );
  }
  return src ? <HeroImage key={src} src={src} className={className} /> : null;
}
