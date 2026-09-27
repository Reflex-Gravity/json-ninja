interface Props {
  srcDoc: string;
  scriptsEnabled: boolean;
  // Lets links with target="_blank" open in a new, unsandboxed tab.
  allowPopups?: boolean;
}

export default function PreviewFrame({ srcDoc, scriptsEnabled, allowPopups }: Props) {
  const sandbox = [
    scriptsEnabled && 'allow-scripts',
    allowPopups && 'allow-popups allow-popups-to-escape-sandbox',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <iframe
      sandbox={sandbox}
      srcDoc={srcDoc}
      className="w-full h-full bg-white border-0"
      title="preview"
    />
  );
}
