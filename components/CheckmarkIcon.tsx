// WhatsApp-style double checkmark
// grey = not opened, blue = opened
export function CheckmarkIcon({ opened }: { opened: boolean }) {
  const color = opened ? '#3b82f6' : '#9ca3af'
  return (
    <svg
      width="18"
      height="11"
      viewBox="0 0 18 11"
      fill="none"
      className="inline-block flex-shrink-0"
      aria-label={opened ? 'Atvērts' : 'Nav atvērts'}
    >
      {/* First tick */}
      <path
        d="M1 5.5L4.5 9L10 1"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Second tick (offset right) */}
      <path
        d="M6 5.5L9.5 9L15 1"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
