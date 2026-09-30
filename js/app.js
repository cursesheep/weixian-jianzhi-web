/* ============================================================
   蔚县剪纸 · 网页版  —— 视图切换 + AI 生图 + 预约（与小程序一致）
   ============================================================ */
(function () {
  'use strict';

  /* 4 个底部 tab + 子视图（历史/工艺/AI/图纸定制） */
  var TABS = ['home', 'hotel', 'creative', 'shop'];
  var SUBS = ['history', 'craft', 'ai', 'papercut'];
  var ALL = TABS.concat(SUBS);
  var lastTab = 'home';

  function gotoView(name) {
    if (ALL.indexOf(name) === -1) return;
    ALL.forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('active', v === name);
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.goto === name);
    });
    var tabbar = document.querySelector('.tabbar');
    if (SUBS.indexOf(name) !== -1) {
      tabbar.classList.add('hidden');
    } else {
      tabbar.classList.remove('hidden');
      lastTab = name;
    }
    window.scrollTo(0, 0);
  }

  /* 顶部 tab 点击 */
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      gotoView(t.dataset.goto);
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
      gotoView(lastTab);
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
      payload = { prompt: prompt };
    } else {
      prompt = document.getElementById('aiPromptImage').value.trim() ||
        '保持主体轮廓与神态，转化为蔚县剪纸风格，红白配色，线条连通';
      if (!photoDataUrl) { setStatus('请先上传一张照片', true); return; }
      payload = { prompt: prompt, imageBase64: photoDataUrl.split(',')[1] };
    }

    setStatus('正在生成剪纸图案，约需 30–60 秒，请稍候…');
    resultEl.classList.add('hidden');
    document.getElementById('genTextBtn').disabled = true;
    document.getElementById('genImageBtn').disabled = true;

    fetch(window.CONFIG.WORKER_URL + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) {
          throw new Error(data.error || '生成失败，请稍后重试');
        }
        renderResult(data.images || []);
        setStatus('');
      })
      .catch(function (err) {
        setStatus('生成失败：' + (err.message || '网络异常，请检查云函数是否已部署'), true);
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
    fetch(window.CONFIG.WORKER_URL + '/proxy?url=' + encodeURIComponent(url))
      .then(function (res) {
        if (!res.ok) throw new Error('下载失败');
        return res.blob();
      })
      .then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'weixian-jiance-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        downloadBtn.textContent = '下载图片';
      })
      .catch(function () {
        downloadBtn.textContent = '下载图片';
        alert('下载失败，请长按图片保存');
      });
  });

})();
