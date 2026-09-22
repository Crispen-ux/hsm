interface ActionBarProps {
  busy: boolean;
  onIssue: () => void;
  onSaveDraft: () => void;
}

export function ActionBar({ busy, onIssue, onSaveDraft }: ActionBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hawk-obsidian-border bg-hawk-obsidian-bg/95 px-4 pt-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto] gap-3">
        <button type="button" onClick={onIssue} disabled={busy} className="btn btn-primary chamfer" data-testid="issue-invoice">
          Issue invoice
        </button>
        <button type="button" onClick={onSaveDraft} disabled={busy} className="btn btn-secondary chamfer" data-testid="save-draft">
          Save draft
        </button>
      </div>
    </div>
  );
}
