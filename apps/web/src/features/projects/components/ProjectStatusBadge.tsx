import { CSSProperties } from "react"

export interface ProjectStatusBadgeProps {
  status: "active" | "archived" | "invalid-path"
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const styles: Record<string, CSSProperties> = {
    active: { backgroundColor: "#4caf50", color: "white", padding: "4px 8px", borderRadius: "4px" },
    archived: { backgroundColor: "#9e9e9e", color: "white", padding: "4px 8px", borderRadius: "4px" },
    "invalid-path": { backgroundColor: "#ff9800", color: "white", padding: "4px 8px", borderRadius: "4px" },
  }

  const labels: Record<string, string> = {
    active: "Active",
    archived: "Archived",
    "invalid-path": "Invalid Path",
  }

  return <span style={styles[status]}>{labels[status]}</span>
}
