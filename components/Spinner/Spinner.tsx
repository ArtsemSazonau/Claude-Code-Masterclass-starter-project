import styles from "./Spinner.module.css"

type SpinnerProps = {
  size?: number
  label?: string
}

export default function Spinner({ size = 32, label = "Loading" }: SpinnerProps) {
  return (
    <div role="status" aria-label={label} className={styles.center}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          className="text-body opacity-25"
        />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-primary"
        />
      </svg>
    </div>
  )
}
