/* ============================================================
   蔚县剪纸 · 网页版  —— 视图切换 + AI 生图 + 预约（与小程序一致）
   ============================================================ */
(function () {
  'use strict';

  /* 视图集合（封面 / 一级目录 / 主视图 / 子视图） */
  var TABS = ['home', 'hotel', 'creative', 'shop'];
  var SUBS = ['ai', 'papercut'];
  var ALL = ['menu'].concat(TABS, SUBS);
  var entered = false;

  /* ---------- 封面页：上滑 / 点击进入 ---------- */
  var cover = document.getElementById('view-cover');
  function enterSite() {
    if (entered) return;
    entered = true;
    cover.classList.remove('active');
    document.getElementById('view-menu').classList.add('active');
    window.scrollTo(0, 0);
  }
  cover.addEventListener('click', enterSite);
  var touchStartY = 0;
  cover.addEventListener('touchstart', function (e) { touchStartY = e.touches[0].clientY; });
  cover.addEventListener('touchend', function (e) {
    var dy = touchStartY - e.changedTouches[0].clientY;
    if (dy > 40) enterSite();
  });
  cover.addEventListener('wheel', function (e) {
    if (e.deltaY > 20) enterSite();
  });

  /* ---------- 视图切换 ---------- */
  var btnBackMenu = document.getElementById('btn-back-menu');
  function gotoView(name) {
    if (ALL.indexOf(name) === -1) return;
    ALL.forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('active', v === name);
    });
    /* 除目录页外，显示「返回目录」按钮 */
    if (btnBackMenu) {
      btnBackMenu.classList.toggle('show', name !== 'menu');
    }
    window.scrollTo(0, 0);
  }
  window.__goMenu = function () { gotoView('menu'); };

  /* 目录页菜单点击 */
  document.querySelectorAll('#view-menu .menu-item').forEach(function (m) {
    m.addEventListener('click', function () {
      gotoView(m.dataset.goto);
    });
  });

  /* 区块/入口跳转 */
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () {
      gotoView(el.dataset.goto);
    });
  });

  /* 子页返回按钮 */
  document.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () {
      gotoView('menu');
    });
  });

  /* ---------- 预约表单（网页版演示） ---------- */
  document.getElementById('reserveForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {};
    new FormData(e.target).forEach(function (v, k) { data[k] = v; });
    alert('已收到预约申请：' + data.name + ' / ' + data.phone + '\n请拨打 0313-7219990 与酒店确认具体场次。');
    e.target.reset();
  });

  /* ---------- 图纸定制表单 ---------- */
  document.getElementById('papercutForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {};
    new FormData(e.target).forEach(function (v, k) { data[k] = v; });
    alert('已收到定制需求：' + data.topic + '\n请拨打 0313-7219990 与我们确认图纸细节。');
    e.target.reset();
  });

  /* ---------- AI 生图 ---------- */
  var mode = 'text';
  var photoDataUrl = null;

  var statusEl = document.getElementById('aiStatus');
  var resultEl = document.getElementById('aiResult');
  var resultGrid = document.getElementById('resultGrid');

  /* AI 生成经 Cloudflare Worker 中转（Key 不暴露给前端） */
  function getWorkerApi() {
    var w = window.CONFIG && window.CONFIG.WORKER_URL;
    return w ? w.replace(/\/+$/, '') + '/generate' : '';
  }

  /* 文生图强化连体提示词（与后端同步） */
  var STYLE_PROMPT = '正宗蔚县剪纸风格，中国国家级非物质文化遗产。' +
    '阴刻为主、阳刻为辅的刻纸技法，红色图案、纯白底。' +
    '构图饱满充实、上下均衡、左右严格对称，实多于虚、面强于线。' +
    '整体必须一刀刻成、浑然一体：所有图案元素经由枝条、轮廓或边沿自然相接，' +
    '全图红色图案为单一连通的完整刻纸，绝对不允许出现完全断离的碎片、悬空小点或断裂的线条。' +
    '人物五官细节（眼睛、眉毛、鼻翼）必须与面部轮廓或发丝线条自然相连，不得悬空独立；' +
    '花蕊、叶尖、流苏端点等细小元素必须附着于枝蔓或主体，不得孤立。' +
    '刀工精细流畅，造型生动传神，镂空艺术，传统民间美术。' +
    '高清细节，商用印刷级品质。画面纯净，不得出现任何文字、字母、数字、水印或标注';

  /* 图生图（照片转剪纸） */
  var IMG2IMG_PROMPT = '正宗蔚县剪纸风格，红白配色，阴刻镂空。将照片中的人物转化为红白剪纸作品：' +
    '严格保留人物的脸型、五官比例、发型与服装款式轮廓，形神兼备、一眼可辨是同一个人；' +
    '所有颜色一律转为剪纸红（头发、衣服、肤色全为红色图案，背景纯白），绝不允许保留照片的任何原色；' +
    '五官通过面部轮廓内的镂空线条表现并与面部自然相连为一体，头发为完整轮廓块，不碎成细丝；' +
    '不添加旗袍、汉服、头饰、花环、背景景物等任何额外元素；全图红色图案单一连通一体成型，构图端正，画面纯净无文字。要求：';

  var NEGATIVE_PROMPT = '文字,字幕,字母,数字,水印,签名,印章,标注,题字,商标,logo,字符,彩色,肤色,独立五官,分离碎片,悬空小块,断线,残片,旗袍,汉服,古装,头饰,花环,发簪,额外装饰,背景景物';

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('hidden', !msg);
    statusEl.classList.toggle('error', !!isError);
  }

  /* 模式切换 */
  document.querySelectorAll('.mode-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      mode = tab.dataset.mode;
      document.querySelectorAll('.mode-tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.getElementById('mode-text').classList.toggle('hidden', mode !== 'text');
      document.getElementById('mode-image').classList.toggle('hidden', mode !== 'image');
      resultEl.classList.add('hidden');
      setStatus('');
    });
  });

  /* 上传照片：压缩到 1024 内再转 dataURL */
  var uploadBox = document.getElementById('uploadBox');
  var photoInput = document.getElementById('photoInput');
  var photoPreview = document.getElementById('photoPreview');
  var photoPreviewImg = document.getElementById('photoPreviewImg');

  uploadBox.addEventListener('click', function () { photoInput.click(); });

  photoInput.addEventListener('change', function () {
    var file = photoInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var max = 1024;
        var w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        photoDataUrl = canvas.toDataURL('image/png');
        photoPreviewImg.src = photoDataUrl;
        uploadBox.classList.add('hidden');
        photoPreview.classList.remove('hidden');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('removePhoto').addEventListener('click', function () {
    photoDataUrl = null;
    photoInput.value = '';
    photoPreview.classList.add('hidden');
    uploadBox.classList.remove('hidden');
  });

  /* 生成 */
  function generate() {
    var prompt, payload;
    if (mode === 'text') {
      prompt = document.getElementById('aiPromptText').value.trim();
      if (!prompt) { setStatus('请先输入描述文字', true); return; }
      payload = { prompt: STYLE_PROMPT + '，主题：' + prompt };
    } else {
      prompt = document.getElementById('aiPromptImage').value.trim() ||
        '保持主体轮廓与神态，转化为蔚县剪纸风格，红白配色，线条连通';
      if (!photoDataUrl) { setStatus('请先上传一张照片', true); return; }
      payload = {
        prompt: IMG2IMG_PROMPT + prompt,
        image: photoDataUrl,
        guidance_scale: 4
      };
    }

    setStatus('正在生成剪纸图案，约需 30–60 秒，请稍候…');
    resultEl.classList.add('hidden');
    document.getElementById('genTextBtn').disabled = true;
    document.getElementById('genImageBtn').disabled = true;

    var api = getWorkerApi();
    if (!api) {
      setStatus('AI 生图服务尚未配置（请先部署 Worker 并填入 WORKER_URL）', true);
      document.getElementById('genTextBtn').disabled = false;
      document.getElementById('genImageBtn').disabled = false;
      return;
    }

    fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: window.CONFIG.SEEDREAM_MODEL,
        prompt: payload.prompt,
        size: '1024x1024',
        response_format: 'url',
        watermark: false,
        negative_prompt: NEGATIVE_PROMPT,
        image: payload.image || null,
        guidance_scale: payload.guidance_scale || null
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.data || !data.data.length) {
          throw new Error((data.error && data.error.message) || '生成失败，请稍后重试');
        }
        renderResult(data.data.map(function (x) { return x.url; }).filter(Boolean));
        setStatus('');
      })
      .catch(function (err) {
        setStatus('生成失败：' + (err.message || '网络异常，请检查网络后重试'), true);
      })
      .finally(function () {
        document.getElementById('genTextBtn').disabled = false;
        document.getElementById('genImageBtn').disabled = false;
      });
  }

  document.getElementById('genTextBtn').addEventListener('click', generate);
  document.getElementById('genImageBtn').addEventListener('click', generate);

  function renderResult(images) {
    resultGrid.innerHTML = '';
    images.forEach(function (url) {
      var img = document.createElement('img');
      img.src = url;
      img.alt = '剪纸候选';
      img.addEventListener('click', function () { openLightbox(url); });
      resultGrid.appendChild(img);
    });
    resultEl.classList.remove('hidden');
  }

  /* ---------- 图片预览 + 下载（经云函数代理） ---------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var downloadBtn = document.getElementById('downloadBtn');

  function openLightbox(url) {
    lightboxImg.src = url;
    downloadBtn.dataset.url = url;
    lightbox.classList.remove('hidden');
  }

  document.getElementById('closeLightbox').addEventListener('click', function () {
    lightbox.classList.add('hidden');
  });
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) lightbox.classList.add('hidden');
  });

  downloadBtn.addEventListener('click', function () {
    var url = downloadBtn.dataset.url;
    if (!url) return;
    downloadBtn.textContent = '下载中…';
    var a = document.createElement('a');
    a.href = url;
    a.download = 'weixian-jiance-' + Date.now() + '.png';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); downloadBtn.textContent = '下载图片'; }, 800);
  });

})();
