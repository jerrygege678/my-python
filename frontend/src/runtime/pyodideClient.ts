export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  result: string | null;
  error?: string;
  errorType?: string;
  timedOut?: boolean;
}

class PyodideClient {
  private worker: Worker | null = null;
  private pending = new Map<number, { resolve: (r: RunResult) => void; timer: number }>();
  private seq = 0;
  private readyPromise: Promise<void> | null = null;
  private progressListeners = new Set<(message: string) => void>();

  /** ★ 订阅加载进度（UI 用它显示「正在加载依赖：numpy…」）；返回取消订阅函数 */
  onProgress(cb: (message: string) => void): () => void {
    this.progressListeners.add(cb);
    return () => {
      this.progressListeners.delete(cb);
    };
  }

  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      // DECISION: 加超时保护——Vite 连接断开或 CDN 不可达时，
      // Worker 可能永远不发 ready/init-error，导致 await init() 永远挂起，
      // handleRun 卡死，输出面板无任何反馈
      const initTimer = window.setTimeout(() => {
        this.worker?.terminate();
        this.worker = null;
        this.readyPromise = null;
        reject(new Error("Pyodide 加载超时（30s），请检查网络后重试"));
      }, 30000);

      this.worker = new Worker("/pyodide-worker.js");

      // DECISION: 监听 Worker 级别 error 事件——脚本加载失败、
      // 未捕获异常等会触发，不监听会导致 readyPromise 永不 settle
      this.worker.addEventListener("error", (ev) => {
        window.clearTimeout(initTimer);
        this.worker?.terminate();
        this.worker = null;
        this.readyPromise = null;
        reject(new Error(`Worker 加载失败：${ev.message || ev.filename || "未知错误"}`));
      });

      this.worker.addEventListener("message", (ev) => {
        const d = ev.data ?? {};
        if (d.type === "ready") {
          window.clearTimeout(initTimer);
          return resolve();
        }
        if (d.type === "init-error") {
          window.clearTimeout(initTimer);
          this.worker?.terminate();
          this.worker = null;
          this.readyPromise = null;
          return reject(new Error(d.error));
        }
        if (d.type === "progress") {
          this.progressListeners.forEach((cb) => cb(String(d.message ?? "")));
          return;
        }
        const slot = d?.id != null ? this.pending.get(d.id) : undefined;
        if (slot) {
          clearTimeout(slot.timer);
          this.pending.delete(d.id);
          slot.resolve(d as RunResult);
        }
      });
    });
    return this.readyPromise;
  }

  async run(code: string, requires: string[] = [], timeoutMs = 8000): Promise<RunResult> {
    await this.init();
    const id = ++this.seq;
    return new Promise<RunResult>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        this.worker?.terminate();
        this.worker = null;
        this.readyPromise = null;
        this.pending.clear();
        resolve({
          ok: false,
          stdout: "",
          stderr: "",
          result: null,
          timedOut: true,
          error: `运行超时（>${timeoutMs / 1000}s），已终止。请检查是否存在死循环。`,
        });
      }, timeoutMs);
      this.pending.set(id, { resolve, timer });
      this.worker!.postMessage({ id, code, requires });
    });
  }
}

export const pyodideClient = new PyodideClient();
