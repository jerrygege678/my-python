import { useState } from "react";
import Editor from "@monaco-editor/react";
import ConfirmDialog from "./ConfirmDialog";

export default function AnswerPanel({
  answer,
  explanation,
  onReveal,
}: {
  answer: string;
  explanation?: string;
  onReveal: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    setConfirming(false);
    setRevealed(true);
    onReveal();
  };

  return (
    <div className="panel p-4">
      {!revealed ? (
        <button className="btn-ghost" onClick={() => setConfirming(true)}>
          📖 查看答案
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">参考答案</p>
          <div className="h-64 border border-slate-200 rounded-lg overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={answer}
              theme="vs"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
              }}
            />
          </div>
          {explanation && (
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-1">解析</p>
              <p className="whitespace-pre-wrap">{explanation}</p>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title="查看答案？"
        message="查看答案不会直接通关，你仍需自己运行通过。"
        confirmText="继续查看"
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
