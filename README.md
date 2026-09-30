# 蔚县剪纸 · 网页版（GitHub Pages + Cloudflare Workers）

无需自己搭服务器、无需备案，扫码即开。结构：

```
web/
├── index.html          # 网页版前端（首页/历史/工艺/体验/定制/文创）
├── css/style.css       # 绛红×宣纸×墨 设计语言
├── js/
│   ├── config.js       # ★ 部署后填 Cloudflare Workers 地址
│   └── app.js          # 视图切换 + AI 生图 + 预约
├── workers/
│   └── worker.js       # ★ AI 生图中转云函数（藏住火山 API Key）
└── images/             # 剪纸素材
```

---

## 一、部署云函数（AI 生图中转，免费）

1. 注册 **Cloudflare** 账号：https://dash.cloudflare.com/signup （邮箱即可，免费、免实名）
2. 打开 **Workers & Pages** → **Create Worker** → 给 Worker 起名（如 `jianzhi-api`）
3. 删除默认代码，粘贴 `workers/worker.js` 全部内容 → **Deploy**
4. 点 Worker 名称进入 → **Settings → Variables**，添加两个变量：
   - `VOLCENGINE_API_KEY` = 您的火山方舟 API Key（`ark-xxx...`）
   - `MODEL` = `doubao-seedream-4-0-250828`（想用 4.0 新版更强人像可改 `doubao-seedream-4-0-20260415`）
5. 记下部署后地址：`https://你的名称.你的子域.workers.dev`

> 安全说明：火山 API Key 只存在 Cloudflare 的环境变量里，不会进入前端代码，不会公开泄露。

## 二、把前端部署到 GitHub Pages

1. 在 GitHub 新建仓库（如 `weixian-jianzhi-web`），把 `web/` 目录下的**所有文件**（index.html、css、js、images）推上去
2. 仓库 **Settings → Pages** → Source 选 `main` 分支 / root → Save
3. 等待 1–2 分钟，得到网址：`https://你的用户名.github.io/weixian-jianzhi-web/`

## 三、填入云函数地址

打开 `js/config.js`，把 `WORKER_URL` 改成第一步的 `https://...workers.dev`，重新推送一次。

## 四、生成二维码

打开任意二维码生成器（推荐 **草料二维码** https://cli.im），粘贴 GitHub Pages 网址，生成二维码即可分享。

> 国内网络访问 GitHub Pages 可能较慢；若体验不佳，可改用 Gitee Pages 或把静态文件部署到微信云开发静态托管（同样免费）。

---

## 功能对照

| 功能 | 网页版 | 说明 |
|---|---|---|
| 首页 / 历史 / 工艺 / 体验 / 文创 | ✅ | 界面复刻小程序 |
| AI 剪纸生成（文生图） | ✅ | 4 幅候选 |
| AI 剪纸生成（上传照片） | ✅ | 自动压缩后图生图 |
| 图片下载 | ✅ | 经云函数代理保存 |
| 预约表单 | ⚠️ 演示 | 提示后电话确认，无真实后台 |
| 碎片剔除后处理 | ❌ | 云函数免费额度无法跑像素级处理，网页版为轻量版 |

## 小程序版差异提醒

- 小程序版（`program(2)(1)`）的后端仍在您本机运行（`server/`），仅本机可访问；
- 网页版是全功能替代方案，扫码即用，AI 生图经云函数中转，Key 安全。
