import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function SandboxToggle({ enabled, onChange }: Props) {
  const Icon = enabled ? ShieldAlert : ShieldCheck;
  return (
    <label className="flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer select-none text-gray-600 dark:text-gray-300">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-500"
      />
      <Icon
        className={`w-3.5 h-3.5 ${
          enabled ? 'text-amber-500' : 'text-green-600 dark:text-green-400'
        }`}
      />
      Enable scripts
    </label>
  );
}
