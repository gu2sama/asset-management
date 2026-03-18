interface Props {
  type: 'info' | 'warn' | 'good' | 'danger';
  title: string;
  body: string;
}

const STYLES = {
  info:   { border: 'border-blue-800',   bg: 'bg-info/10',   icon: 'ℹ️' },
  warn:   { border: 'border-warn/30',  bg: 'bg-warn/10',  icon: '⚠️' },
  good:   { border: 'border-gain/30',bg: 'bg-gain/10',icon: '✅' },
  danger: { border: 'border-loss/30',    bg: 'bg-loss/10',    icon: '🔴' },
};

export function CommentCard({ type, title, body }: Props) {
  const s = STYLES[type];
  return (
    <div className={`border rounded-xl p-3 ${s.border} ${s.bg}`}>
      <div className="flex gap-2">
        <span className="text-base flex-shrink-0">{s.icon}</span>
        <div>
          <div className="text-text text-xs font-semibold mb-0.5">{title}</div>
          <div className="text-text text-xs leading-relaxed">{body}</div>
        </div>
      </div>
    </div>
  );
}
