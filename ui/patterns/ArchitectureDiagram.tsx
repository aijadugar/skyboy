import { ArchitectureDiagramClient } from '@/ui/patterns/ArchitectureDiagramClient'

export function ArchitectureDiagram({ chart }: { chart: string }) {
  return (
    <div className="my-6 aspect-[16/9] overflow-x-auto border-2 border-[var(--border)] bg-[var(--bg-card)] shadow-[3px_3px_0_var(--border)]">
      <ArchitectureDiagramClient chart={chart} />
    </div>
  )
}
