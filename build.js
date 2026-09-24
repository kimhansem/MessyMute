#!/usr/bin/env node
// 정적 페이지 생성 스크립트.
// flowers.json을 읽어서 index.html, gallery.html, flower/{date}.html 366개를 생성한다.
// 이 스크립트는 빌드 타임에만 실행되고, 결과물(생성된 HTML)이 실제로 커밋/배포된다.
// (별도 서버나 CI 없이 GitHub Pages로 정적 파일만 서빙하는 구조이기 때문)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const flowers = JSON.parse(fs.readFileSync(path.join(ROOT, 'flowers.json'), 'utf8'));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

const HEAD = `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MEMU</title>
  <meta name="apple-mobile-web-app-title" content="MEMU">
  <link rel="stylesheet" href="/styles.css">

  <!-- Adobe Typekit -->
  <script>
    (function(d) {
      var config = { kitId: 'xca0zac', scriptTimeout: 3000, async: true },
      h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\\bwf-loading\\b/g,"")+" wf-inactive";},config.scriptTimeout),
      tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;
      h.className+=" wf-loading";tk.src='https://use.typekit.net/'+config.kitId+'.js';tk.async=true;
      tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;
      f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)
    })(document);
  </script>

<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
`;

function page(bodyClass, bodyHtml, extraScript) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${HEAD}</head>

<body class="${bodyClass}">
${bodyHtml}
</body>
</html>
`;
}

// ---------- index.html ----------
const validDates = flowers.map(f => f.date);
const indexBody = `  <div id="mainPage">
    <div id="message">당신의 탄생화는 무엇인가요?</div>
    <input type="text" id="dateInput" placeholder="생일을 입력해주세요 ex) 0123" class="custom-input">
    <button id="confirmBtn">enter</button>
  </div>

<script>
  var VALID_DATES = ${JSON.stringify(validDates)};

  function go() {
    var input = document.getElementById('dateInput').value.trim();
    if (!/^\\d{4}$/.test(input) || VALID_DATES.indexOf(input) === -1) {
      alert("날짜 형식이 올바르지 않습니다. 예: 0103");
      return;
    }
    location.href = '/flower/' + input + '.html';
  }

  document.getElementById('confirmBtn').addEventListener('click', go);
  document.getElementById('dateInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') go();
  });
</script>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), page('main-bg', indexBody));

// ---------- gallery.html ----------
const items = flowers.map((f, i) => {
  const delay = Math.min(i, 24) * 40; // 화면 밖 썸네일까지 무한정 지연되지 않도록 상한
  return `    <a href="/flower/${f.date}.html"><img src="/img/thumb/${f.date}.jpg" alt="${f.date}" loading="lazy" style="animation-delay:${delay}ms"></a>`;
}).join('\n');

const galleryBody = `  <a id="goMainBtn2" href="/index.html">main</a>
  <div class="gallery-grid" id="galleryGrid">
${items}
  </div>

<script>
  // 상세페이지에서 갤러리로 돌아왔을 때 스크롤 위치를 복원한다.
  // history.back()/bfcache에 의존하면 브라우저가 직전에 클릭한 링크로
  // 포커스를 옮기며 스크롤을 덮어써버리는 경우가 있어, sessionStorage로 직접 관리한다.
  (function () {
    var KEY = 'galleryScrollY';
    try {
      if (document.referrer && new URL(document.referrer).pathname.indexOf('/flower/') === 0) {
        var saved = sessionStorage.getItem(KEY);
        if (saved !== null) window.scrollTo(0, parseInt(saved, 10));
      } else {
        sessionStorage.removeItem(KEY);
      }
    } catch (e) {}

    document.querySelectorAll('.gallery-grid a').forEach(function (a) {
      a.addEventListener('click', function () {
        sessionStorage.setItem(KEY, window.scrollY);
      });
    });
  })();
</script>`;

fs.writeFileSync(path.join(ROOT, 'gallery.html'), page('gallery-bg', galleryBody));

// ---------- flower/{date}.html ----------
const flowerDir = path.join(ROOT, 'flower');
if (!fs.existsSync(flowerDir)) fs.mkdirSync(flowerDir);
// 이전 빌드 결과물 중 flowers.json에서 빠진 날짜가 있으면 정리
for (const name of fs.readdirSync(flowerDir)) {
  const date = name.replace(/\.html$/, '');
  if (!validDates.includes(date)) fs.unlinkSync(path.join(flowerDir, name));
}

for (const f of flowers) {
  const linkBtn = f.link
    ? `\n        <a id="goLinkBtn" href="${escapeAttr(f.link)}" target="_blank" rel="noopener">download</a>`
    : '';

  const body = `  <div id="detailPage">
    <img id="flowerImage" src="/img/${f.date}.jpg" alt="${escapeAttr(f.title)}">
    <div class="textBox">
      <p id="flowerTitle">${escapeHtml(f.title)}</p>
      <p id="flowerBody">${escapeHtml(f.body)}</p>
      <p id="flowerClosing">${escapeHtml(f.closing)}</p>
      <div id="btnBox">
        <a id="goMainBtn1" href="/index.html">main</a>
        <a id="goGalleryBtn" href="/gallery.html">see all</a>${linkBtn}
      </div>
    </div>
  </div>`;

  fs.writeFileSync(path.join(flowerDir, `${f.date}.html`), page('detail-bg', body));
}

console.log(`Generated index.html, gallery.html, and flower/*.html for ${flowers.length} dates.`);
