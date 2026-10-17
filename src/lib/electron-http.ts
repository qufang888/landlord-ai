/**
 * 渲染进程 HTTP 桥
 *
 * 在 Electron 桌面环境下，所有外部 LLM / 模型列表请求统一通过主进程的 `http-request`
 * IPC 发起（Node fetch 不受浏览器 CORS 限制）。在纯 Web 环境下回退到浏览器原生 fetch。
 */

export interface ElectronHttpResult {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  data: unknown;
}

export interface ElectronHttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface ElectronHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

/** 是否处于 Electron 桌面环境（存在 preload 暴露的 electronAPI） */
export function isElectronDesktop(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI?.isDesktop;
}

/**
 * 发起 HTTP 请求。
 * - Electron：走主进程 Node fetch（无 CORS 限制）。
 * - Web：回退到浏览器 fetch（受 CORS 限制，仅适用于带 CORS 的服务或经代理）。
 */
export async function electronFetch(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    timeout?: number;
  } = {},
): Promise<ElectronHttpResponse> {
  const api = (window as any).electronAPI;
  if (api?.http) {
    const res: ElectronHttpResult = await api.http({
      method: init.method || 'GET',
      url,
      headers: init.headers || {},
      body: init.body,
      timeout: init.timeout ?? 15000,
    });
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      text: async () => res.text,
      json: async () => (res.data !== null && res.data !== undefined ? res.data : JSON.parse(res.text)),
    };
  }
  // Web 回退
  const r = await fetch(url, init as any);
  return {
    ok: r.ok,
    status: r.status,
    statusText: r.statusText,
    text: () => r.text(),
    json: () => r.json(),
  } as ElectronHttpResponse;
}

export default electronFetch;
