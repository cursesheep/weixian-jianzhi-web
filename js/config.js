/* ============================================================
   蔚县剪纸 · AI 生图配置（阿里云函数计算 FC 中转模式）
   网页端不保存 API Key，由 FC 函数代为调用火山方舟，
   Key 仅存于 FC 函数的环境变量 VOLC_API_KEY 中。
   公网地址：https://ai-jianzhi-utqhzniorg.cn-beijing.fcapp.run
   ============================================================ */
window.CONFIG = {
  WORKER_URL: "https://ai-jianzhi-utqhzniorg.cn-beijing.fcapp.run",
  SEEDREAM_MODEL: "doubao-seedream-4-0-20260415"
};
