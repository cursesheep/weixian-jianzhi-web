/* ============================================================
   蔚县剪纸 · AI 生图配置（Cloudflare Worker 中转模式）
   网页端不保存 API Key，由 Worker 代为调用火山方舟，
   Key 仅存于 Cloudflare Worker 的环境变量中。
   部署 Worker 后把 WORKER_URL 改成你的 Worker 地址，
   例如：https://jiance-ai-proxy.xxx.workers.dev
   ============================================================ */
window.CONFIG = {
  WORKER_URL: "",
  SEEDREAM_MODEL: "doubao-seedream-4-0-20260415"
};
