import Editor from "@monaco-editor/react";

export default function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      language="python"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme="vs"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontLigatures: true,
        scrollBeyondLastLine: false,
        tabSize: 4,
        automaticLayout: true,
        wordWrap: "on",
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
