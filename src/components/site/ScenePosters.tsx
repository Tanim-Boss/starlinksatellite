/**
 * Paint-only stand-ins for the 3D views.
 *
 * These deliberately live outside the three.js modules: the route chunks use
 * them as the React Suspense fallback for a lazily imported canvas, so they
 * must not pull the engine in with them.
 */

/** Globe silhouette painted before the hero's engine chunk arrives. */
export function GlobePoster() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(52% 52% at 55% 48%, rgba(61,219,217,0.10) 0%, rgba(96,165,250,0.08) 46%, rgba(4,6,13,0) 70%)",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 opacity-40"
        fill="none"
        aria-hidden
      >
        <circle cx="100" cy="100" r="46" stroke="#1d3a5c" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="72" ry="26" stroke="#24486e" strokeWidth="0.8" transform="rotate(-18 100 100)" />
        <ellipse cx="100" cy="100" rx="72" ry="26" stroke="#1b3450" strokeWidth="0.8" transform="rotate(34 100 100)" />
        <circle cx="157" cy="67" r="2.6" fill="#3ddbd9" fillOpacity="0.8" />
      </svg>
    </div>
  );
}
