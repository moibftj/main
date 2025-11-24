'use client'

interface GenerateButtonProps {
  loading?: boolean;
  disabled?: boolean;
  hasSubscription?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

export function GenerateButton({
  loading = false,
  disabled = false,
  hasSubscription = false,
  onClick,
  type = 'button',
  className = ''
}: GenerateButtonProps) {
  const buttonText = loading
    ? 'Generating...'
    : hasSubscription
      ? 'Generate Attorney Draft'
      : 'Subscribe to Generate';

  return (
    <div className={`btn-wrapper ${className}`}>
      <button
        type={type}
        className="btn"
        onClick={onClick}
        disabled={loading || disabled}
      >
        <svg
          className="btn-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
          />
        </svg>

        <div className="txt-wrapper">
          <div className="txt-1">
            {buttonText.split('').map((letter, index) => (
              <span key={index} className="btn-letter">
                {letter}
              </span>
            ))}
          </div>
          <div className="txt-2">
            {loading ? 'Generating...' : buttonText.split('').map((letter, index) => (
              <span key={index} className="btn-letter">
                {letter}
              </span>
            ))}
          </div>
        </div>
      </button>
    </div>
  )
}