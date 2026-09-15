interface Props {
  srcDoc: string;
  scriptsEnabled: boolean;
}

export default function PreviewFrame({ srcDoc, scriptsEnabled }: Props) {
  return (
    <iframe
      sandbox={scriptsEnabled ? 'allow-scripts' : ''}
      srcDoc={srcDoc}
      className="w-full h-full bg-white border-0"
      title="preview"
    />
  );
}
