/**
 * 蔚县剪纸 · AI 生图中转云函数（Cloudflare Workers）
 *
 * 部署步骤（无需服务器、免费、免实名）：
 * 1. 注册 Cloudflare 账号 → 打开 https://workers.cloudflare.com → Create Worker
 * 2. 把本文件内容粘贴到 Worker 代码区
 * 3. 在 Settings → Variables 添加：
 *      VOLCENGINE_API_KEY = 您的火山方舟 API Key（ark-xxx）
 *      MODEL = doubao-seedream-4-0-20260415（新版模型，旧版 250828 已停权）
 * 4. Deploy 部署，获得形如 https://xxx.workers.dev 的地址
 * 5. 把该地址填到前端 js/config.js 的 WORKER_URL
 *
 * 接口：
 *   POST /generate   { prompt, imageBase64? }  -> { success, images:[4个URL] }
 *   GET  /proxy?url=...                         -> 图片二进制（供下载）
 */

const VOLCENGINE_API = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const NEGATIVE_PROMPT = '文字,字母,数字,英文,水印,logo,签名,噪点,脏点';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    /* ---------- 生成剪纸 ---------- */
    if (url.pathname === '/generate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const prompt = String(body.prompt || '').trim();
        if (!prompt) return json({ success: false, error: '缺少 prompt' }, 400);
        if (!env.VOLCENGINE_API_KEY) {
          return json({ success: false, error: '云函数未配置 VOLCENGINE_API_KEY' }, 500);
        }

        const payload = {
          model: env.MODEL || 'doubao-seedream-4-0-20260415',
          prompt: prompt,
          size: '1024x1024',
          response_format: 'url',
          watermark: false,
          negative_prompt: NEGATIVE_PROMPT
        };

        // 图生图：火山访问不了 localhost，直接传 data URL（前端已压缩到 1024 内）
        if (body.imageBase64) {
          payload.image_url = 'data:image/png;base64,' + String(body.imageBase64);
        }

        const resp = await fetch(VOLCENGINE_API, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + env.VOLCENGINE_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await resp.json();
        if (!resp.ok) {
          return json({ success: false, error: '火山API错误: ' + (data.error?.message || resp.status) }, resp.status);
        }

        const images = (data.data || []).map(x => x.url).filter(Boolean);
        return json({ success: true, images: images });
      } catch (e) {
        return json({ success: false, error: '生成失败: ' + e.message }, 500);
      }
    }

    /* ---------- 下载代理（解决跨域保存图片） ---------- */
    if (url.pathname === '/proxy' && request.method === 'GET') {
      try {
        const target = url.searchParams.get('url');
        if (!target || !/^https?:\/\//.test(target)) {
          return json({ success: false, error: '参数错误' }, 400);
        }
        const r = await fetch(target);
        const buf = await r.arrayBuffer();
        return new Response(buf, {
          headers: {
            ...CORS,
            'Content-Type': r.headers.get('Content-Type') || 'image/png',
            'Content-Disposition': 'attachment; filename="weixian-jiance.png"'
          }
        });
      } catch (e) {
        return json({ success: false, error: '下载失败: ' + e.message }, 500);
      }
    }

    return json({ success: false, error: 'not found' }, 404);
  }
};
