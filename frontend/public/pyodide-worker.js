const PYODIDE_VERSION = "0.26.2";
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide = null, stdoutBuf = [], stderrBuf = [], ready = false;
const loadedPackages = new Set();

// DECISION: 立即通知主线程开始加载，让 UI 显示进度
self.postMessage({ type: "progress", message: "正在初始化 Python 运行环境…" });

/** 按需加载第三方包：先走 Pyodide 内置分发，失败再回退 micropip */
async function loadPackages(pkgs) {
  const todo = pkgs.filter((p) => !loadedPackages.has(p));
  if (!todo.length) return;
  self.postMessage({ type: "progress", message: `正在加载依赖：${todo.join("、")}` });
  try {
    await pyodide.loadPackage(todo);
  } catch (e) {
    const micropip = pyodide.pyimport("micropip");
    for (const p of todo) await micropip.install(p);
  }
  todo.forEach((p) => loadedPackages.add(p));
}

async function ensurePyodide() {
  if (pyodide) return;
  self.postMessage({ type: "progress", message: "正在下载 Pyodide 运行时（约 5-15 秒）…" });
  try {
    importScripts(CDN + "pyodide.js");
  } catch (e) {
    throw new Error(`加载 Pyodide 脚本失败：${(e && e.message) || e}`);
  }
  self.postMessage({ type: "progress", message: "正在初始化 Pyodide…" });
  pyodide = await loadPyodide({ indexURL: CDN });
  pyodide.setStdout({ batched: (s) => stdoutBuf.push(s) });
  pyodide.setStderr({ batched: (s) => stderrBuf.push(s) });
  ready = true;
  self.postMessage({ type: "ready" });
}
ensurePyodide().catch((e) =>
  self.postMessage({ type: "init-error", error: String((e && e.message) || e) })
);

self.onmessage = async (e) => {
  const { id, code, requires = [] } = e.data || {};
  if (!ready) { self.postMessage({ id, ok: false, error: "Pyodide 尚未就绪" }); return; }
  stdoutBuf = []; stderrBuf = [];
  try {
    if (requires.length) await loadPackages(requires);
    const r = await pyodide.runPythonAsync(code);
    self.postMessage({
      id, ok: true,
      stdout: stdoutBuf.join("\n"),
      stderr: stderrBuf.join("\n"),
      result: r === undefined ? null : String(r),
    });
  } catch (err) {
    self.postMessage({
      id, ok: false,
      stdout: stdoutBuf.join("\n"),
      stderr: stderrBuf.join("\n"),
      error: String((err && err.message) || err),
      errorType: String((err && err.name) || "Error"),
    });
  }
};
