type HarnessSoftGateBannerProps = {
  requiresOverride: boolean
  overriddenAt: string | null
  onOverrideClick: () => void
}

export function HarnessSoftGateBanner(props: HarnessSoftGateBannerProps) {
  if (!props.requiresOverride && !props.overriddenAt) return null

  if (props.requiresOverride) {
    return (
      <div
        data-testid="harness-soft-gate-banner"
        className="mb-4 flex items-center justify-between rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm"
      >
        <span>Harness soft gate is active. Override is required before sensitive actions.</span>
        <button className="rounded border border-amber-500 px-2 py-1 font-medium" onClick={props.onOverrideClick}>
          Override
        </button>
      </div>
    )
  }

  return (
    <div
      data-testid="harness-soft-gate-overridden"
      className="mb-4 rounded border border-blue-300 bg-blue-50 px-4 py-3 text-sm"
    >
      Soft gate overridden on {new Date(props.overriddenAt as string).toLocaleString()}.
    </div>
  )
}
