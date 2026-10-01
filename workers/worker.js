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

// 最新提示词配置（与小程序后端 server/routes/ai.js 同步 2026-10-01）
const STYLE_PROMPT = '正宗蔚县剪纸风格，中国国家级非物质文化遗产。' +
  '阴刻为主、阳刻为辅的刻纸技法，红色图案、纯白底。' +
  '构图饱满充实、上下均衡、左右严格对称，实多于虚、面强于线。' +
  '整体必须一刀刻成、浑然一体：所有图案元素经由枝条、轮廓或边沿自然相接，' +
  '全图红色图案为单一连通的完整刻纸，绝对不允许出现完全断离的碎片、悬空小点或断裂的线条。' +
  '人物五官细节（眼睛、眉毛、鼻翼）必须与面部轮廓或发丝线条自然相连，不得悬空独立；' +
  '花蕊、叶尖、流苏端点等细小元素必须附着于枝蔓或主体，不得孤立。' +
  '刀工精细流畅，造型生动传神，镂空艺术，传统民间美术。' +
  '高清细节，商用印刷级品质。画面纯净，不得出现任何文字、字母、数字、水印或标注';

// 图生图（照片转剪纸）：相似度约束前置，防模型发挥改变人物造型
const IMG2IMG_PROMPT = '正宗蔚县剪纸风格，红白配色，阴刻镂空。将照片中的人物转化为红白剪纸作品：' +
  '严格保留人物的脸型、五官比例、发型与服装款式轮廓，形神兼备、一眼可辨是同一个人；' +
  '所有颜色一律转为剪纸红（头发、衣服、肤色全为红色图案，背景纯白），绝不允许保留照片的任何原色；' +
  '五官通过面部轮廓内的镂空线条表现并与面部自然相连为一体，头发为完整轮廓块，不碎成细丝；' +
  '不添加旗袍、汉服、头饰、花环、背景景物等任何额外元素；全图红色图案单一连通一体成型，构图端正，画面纯净无文字。要求：';

const NEGATIVE_PROMPT = '文字,字幕,字母,数字,水印,签名,印章,标注,题字,商标,logo,字符,彩色,肤色,独立五官,分离碎片,悬空小块,断线,残片,旗袍,汉服,古装,头饰,花环,发簪,额外装饰,背景景物';

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
        const userPrompt = String(body.prompt || '').trim();
        if (!userPrompt) return json({ success: false, error: '缺少 prompt' }, 400);
        if (!env.VOLCENGINE_API_KEY) {
          return json({ success: false, error: '云函数未配置 VOLCENGINE_API_KEY' }, 500);
        }
        const hasImage = Boolean(body.imageBase64);
        const prompt = hasImage ? IMG2IMG_PROMPT + userPrompt : STYLE_PROMPT + '，主题：' + userPrompt;

        const payload = {
          model: env.MODEL || 'doubao-seedream-4-0-20260415',
          prompt: prompt,
          size: '1024x1024',
          response_format: 'url',
          watermark: false,
          negative_prompt: NEGATIVE_PROMPT
        };

        // 图生图：火山访问不了 localhost，直接传 data URL（前端已压缩到 1024 内）
        if (hasImage) {
          payload.image = 'data:image/png;base64,' + String(body.imageBase64);
          payload.guidance_scale = 4; // 忠实原图与剪纸转化的平衡点
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
