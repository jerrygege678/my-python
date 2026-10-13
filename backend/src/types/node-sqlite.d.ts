// DECISION: node:sqlite 在 @types/node v22 中可能缺少类型声明，此处补全
declare module "node:sqlite" {
  export interface StatementSync {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    finalize(): void;
  }

  export interface DatabaseSync {
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
