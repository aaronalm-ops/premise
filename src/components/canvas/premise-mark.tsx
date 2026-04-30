// Premise wordmark / icon.
// Concept: one premise (the dot) splitting into multiple paths (the rays).
// Maps to D-018 / D-019 — "the chatbot proposes options, the researcher picks."

export function PremiseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="18" r="2.25" fill="currentColor" />
      <path
        d="M6 18 L20 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 18 L20 11.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 18 L20 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
