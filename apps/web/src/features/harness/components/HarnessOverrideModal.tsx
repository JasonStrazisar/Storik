import { useState } from "react"

type HarnessOverrideModalProps = {
  open: boolean
  isPending: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}

export function HarnessOverrideModal(props: HarnessOverrideModalProps) {
  const [reason, setReason] = useState("")

  if (!props.open) return null

  return (
    <div data-testid="harness-override-modal" className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded border border-gray-200 bg-white p-4">
        <h3 className="text-lg font-semibold">Soft gate override</h3>
        <p className="mt-1 text-sm text-gray-600">
          Provide a short justification to proceed despite current harness risks.
        </p>
        <textarea
          data-testid="harness-override-reason"
          className="mt-3 h-28 w-full rounded border border-gray-300 p-2 text-sm"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for override..."
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="rounded border border-gray-300 px-3 py-1.5 text-sm" onClick={props.onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={props.isPending || reason.trim().length < 5}
            onClick={() => props.onSubmit(reason)}
            className="rounded border border-gray-900 bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {props.isPending ? "Saving..." : "Confirm override"}
          </button>
        </div>
      </div>
    </div>
  )
}
