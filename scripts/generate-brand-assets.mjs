import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const outputs = {
  extensionIcons: resolve(root, "apps/extension/public/icon"),
  readme: resolve(root, "docs/assets/readme"),
  store: resolve(root, "docs/assets/store")
};

const theme = {
  ink: "#18241f",
  muted: "#5c6b63",
  leaf: "#2f7d5b",
  mint: "#dcefe5",
  cloud: "#eef5f1",
  paper: "#fffdf8",
  line: "#d7e2db",
  amber: "#b97b1d",
  rose: "#b84242"
};

function htmlShell(width, height, body) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
      body {
        font-family: "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
        background:
          radial-gradient(circle at 16% 10%, rgba(47, 125, 91, 0.16), transparent 30%),
          radial-gradient(circle at 88% 14%, rgba(185, 123, 29, 0.12), transparent 24%),
          linear-gradient(135deg, ${theme.paper}, ${theme.cloud});
        color: ${theme.ink};
      }
      .frame { width: ${width}px; height: ${height}px; padding: 46px; position: relative; }
      .brand { display: flex; align-items: center; gap: 14px; font-weight: 900; font-size: 28px; }
      .mark { width: 54px; height: 54px; border-radius: 14px; display: grid; place-items: center; background: ${theme.ink}; color: white; box-shadow: 0 18px 50px rgba(24, 36, 31, 0.18); }
      .mark svg { width: 34px; height: 34px; }
      .pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid ${theme.line}; background: rgba(255,255,255,0.76); border-radius: 999px; padding: 9px 14px; color: ${theme.leaf}; font-weight: 800; font-size: 15px; }
      .card { background: rgba(255,255,255,0.88); border: 1px solid ${theme.line}; border-radius: 18px; box-shadow: 0 24px 70px rgba(24,36,31,0.12); }
      .button { display: inline-flex; align-items: center; gap: 10px; background: ${theme.ink}; color: white; border-radius: 12px; padding: 14px 18px; font-weight: 900; }
      .secondary { background: white; color: ${theme.ink}; border: 1px solid ${theme.line}; }
      .risk-high { color: ${theme.rose}; background: #fff0f0; }
      .risk-mid { color: ${theme.amber}; background: #fff7e8; }
      .risk-low { color: #60736a; background: #eef5f1; }
      .mono { font-family: "Cascadia Mono", "SFMono-Regular", Consolas, monospace; }
      ${sharedStyles()}
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function sharedStyles() {
  return `
    .grid { display: grid; gap: 22px; }
    .cols-2 { grid-template-columns: 1.02fr 0.98fr; }
    .cols-3 { grid-template-columns: repeat(3, 1fr); }
    .muted { color: ${theme.muted}; }
    .h1 { font-size: 76px; line-height: 0.98; letter-spacing: 0; margin: 26px 0 24px; font-weight: 950; }
    .h2 { font-size: 42px; line-height: 1.1; letter-spacing: 0; margin: 0; font-weight: 950; }
    .lead { font-size: 25px; line-height: 1.62; color: ${theme.muted}; margin: 0; }
    .mini { font-size: 15px; line-height: 1.6; color: ${theme.muted}; }
    .metric { border-radius: 16px; padding: 18px; font-weight: 900; }
    .metric b { display: block; font-size: 44px; line-height: 1; margin-top: 8px; }
    .textarea { min-height: 426px; border-radius: 16px; border: 1px solid ${theme.line}; background: white; padding: 22px; line-height: 1.8; font-size: 18px; }
    .finding { display: flex; gap: 14px; align-items: flex-start; border-bottom: 1px solid ${theme.line}; padding: 15px 0; }
    .check { width: 22px; height: 22px; border-radius: 6px; background: ${theme.leaf}; color: white; display: grid; place-items: center; font-weight: 900; flex: 0 0 auto; }
    .preview { border-radius: 16px; border: 1px dashed ${theme.line}; background: #fbfefa; padding: 22px; font-size: 18px; line-height: 1.8; }
  `;
}

function markSvg() {
  return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M32 6 52 14v16c0 14.2-8.4 23.8-20 28-11.6-4.2-20-13.8-20-28V14L32 6Z" fill="white" opacity=".96"/>
    <path d="M22 32.5 29 39l14-17" stroke="${theme.leaf}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function iconHtml(size) {
  const radius = Math.round(size * 0.22);
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}
.icon{width:${size}px;height:${size}px;border-radius:${radius}px;background:linear-gradient(135deg,${theme.ink},#24483a);display:grid;place-items:center;position:relative}
.icon:before{content:"";position:absolute;inset:${Math.max(2, Math.round(size * 0.08))}px;border-radius:${Math.round(radius * 0.7)}px;border:${Math.max(1, Math.round(size * 0.035))}px solid rgba(255,255,255,.24)}
svg{width:${Math.round(size * 0.64)}px;height:${Math.round(size * 0.64)}px;position:relative}
</style></head><body><div class="icon">${markSvg()}</div></body></html>`;
}

function lpScreenshot() {
  return htmlShell(
    1280,
    800,
    `<div class="frame">
      <div class="brand"><div class="mark">${markSvg()}</div>AIまえチェック</div>
      <div class="grid cols-2" style="align-items:center; height:650px;">
        <section>
          <div class="pill">本体は、AIサービス上で動くChrome拡張です。</div>
          <h1 class="h1">Chrome拡張で、<br>そのまま貼らない。</h1>
          <p class="lead">ChatGPT・Claude・Geminiに文章を貼る前に、個人情報・秘密情報・社内情報の消し忘れに気づくための確認レイヤーです。</p>
          <div style="display:flex;gap:14px;margin-top:34px"><div class="button">拡張機能の使い方を見る</div><div class="button secondary">ミニデモで試す</div></div>
        </section>
        <section class="card" style="padding:26px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"><b style="font-size:22px;">貼り付け前チェック</b><span class="pill">ブラウザ内処理</span></div>
          <div class="grid cols-3">
            <div class="metric risk-high">高リスク<b>5</b></div>
            <div class="metric risk-mid">中リスク<b>3</b></div>
            <div class="metric risk-low">低リスク<b>0</b></div>
          </div>
          <div class="preview mono" style="margin-top:20px;">
            [EMAIL_1]<br>[PHONE_1]<br>[CUSTOMER_1] 向け提案メモ<br>[PROJECT_1]
          </div>
        </section>
      </div>
    </div>`
  );
}

function demoScreenshot() {
  return htmlShell(
    1280,
    800,
    `<div class="frame">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <div><div class="pill">拡張を入れる前のミニデモ</div><h2 class="h2" style="margin-top:14px;">貼り付け前チェックの動きを試す</h2></div>
        <div style="display:flex;gap:12px;"><div class="button">ルールで検出</div><div class="button secondary">AI文脈チェック</div></div>
      </div>
      <div class="card" style="padding:22px;">
        <div class="grid cols-2">
          <div>
            <b style="font-size:22px;">外部AIへ送る前の下書き</b>
            <div class="textarea mono" style="margin-top:14px;">
              田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。<br><br>
              A社向けの提案資料について、NDA締結前なので関係者限りで確認してください。<br><br>
              AWS_ACCESS_KEY_ID=AKIA_DUMMY_SAMPLE
            </div>
          </div>
          <div>
            <b style="font-size:22px;">検出結果</b>
            <div class="grid cols-3" style="margin-top:14px;">
              <div class="metric risk-high">高<b>5</b></div><div class="metric risk-mid">中<b>3</b></div><div class="metric risk-low">低<b>0</b></div>
            </div>
            <div style="margin-top:10px;">
              ${["メールアドレス", "日本の電話番号", "AWS Access Key", "社外秘・注意語", "金額"].map((label) => `<div class="finding"><div class="check">✓</div><div><b>${label}</b><div class="mini">安全化対象に含める</div></div></div>`).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>`
  );
}

function modalScreenshot() {
  return htmlShell(
    1280,
    800,
    `<div class="frame" style="display:grid;place-items:center;">
      <div style="position:absolute; inset:0; background:rgba(24,36,31,.18);"></div>
      <div class="card" style="width:1020px;padding:30px;position:relative;">
        <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
          <div><div class="pill">Chrome拡張の確認モーダル</div><h2 class="h2" style="margin-top:14px;">安全化してから貼り付けますか？</h2><p class="lead" style="font-size:20px;margin-top:14px;">貼り付けようとしている文章に、秘密情報や高リスク情報の可能性があります。</p></div>
          <div class="metric risk-high" style="width:150px;text-align:center;">判定<b>高</b></div>
        </div>
        <div class="grid cols-2" style="margin-top:24px;">
          <div>
            ${[
              ["メールアドレス", "高リスク / 安全化対象"],
              ["GitHub token風文字列", "高リスク / 秘密情報保護の対象"],
              ["顧客名候補", "AI文脈チェック候補"],
              ["契約・採用文脈", "中リスク / 確認対象"]
            ].map(([label, detail], index) => `<div class="finding"><div class="check">${index + 1}</div><div><b>${label}</b><div class="mini">${detail}</div></div></div>`).join("")}
            <div class="card" style="padding:16px;margin-top:16px;box-shadow:none;">
              <b>WebLLMによる文脈チェック結果</b>
              <p class="mini" style="margin:8px 0 0;">顧客名や契約前情報と思われる注意候補が見つかりました。候補はユーザーが安全化対象に含めるか選べます。</p>
            </div>
          </div>
          <div class="preview mono">
            [CUSTOMER_1]向けの[PROJECT_1]提案メモです。<br>
            連絡先は [EMAIL_1] です。<br>
            GITHUB_TOKEN=[GITHUB_TOKEN_1]<br><br>
            候補者の[PERSON_1]さんについて、評価メモを確認します。<br><br>
            ※安全を保証するものではありません。
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;"><div class="button">安全化して貼り付け</div><div class="button secondary">AI文脈チェックも実行</div><div class="button secondary">キャンセル</div></div>
      </div>
    </div>`
  );
}

function optionsScreenshot() {
  return htmlShell(
    1280,
    800,
    `<div class="frame">
      <div class="brand"><div class="mark">${markSvg()}</div>AIまえチェック 設定</div>
      <div class="grid cols-2" style="margin-top:28px;">
        <div class="card" style="padding:26px;">
          <h2 class="h2" style="font-size:34px;">対象サイトと検出ルール</h2>
          ${["ChatGPT", "Claude", "Gemini", "メール・電話・APIキー", "社外秘・社内URL"].map((label) => `<div class="finding"><div class="check">✓</div><div><b>${label}</b><div class="mini">有効</div></div></div>`).join("")}
        </div>
        <div class="card" style="padding:26px;">
          <h2 class="h2" style="font-size:34px;">AI文脈チェック</h2>
          <div class="finding"><div class="check">✓</div><div><b>手動実行</b><div class="mini">初期設定では自動実行しません</div></div></div>
          <div class="finding"><div class="check">✓</div><div><b>標準モデル</b><div class="mini">Llama 3.2 1B q4f32</div></div></div>
          <div class="preview">貼り付け本文は永続保存しません。設定と検証済みルールキャッシュだけをChromeのローカル保存領域に保存します。WebLLMの初回利用時にはモデルファイルを取得する場合があります。</div>
        </div>
      </div>
    </div>`
  );
}

function promoSmall() {
  return htmlShell(
    440,
    280,
    `<div class="frame" style="padding:24px;">
      <div class="brand" style="font-size:20px;"><div class="mark" style="width:42px;height:42px;border-radius:12px;">${markSvg()}</div>AIまえチェック</div>
      <h1 style="font-size:36px;line-height:1.08;margin:26px 0 12px;font-weight:950;">AIに貼る前に、<br>消し忘れを見つける。</h1>
      <p class="mini">ブラウザ内で検出。本文は保存しません。</p>
    </div>`
  );
}

function promoMarquee() {
  return htmlShell(
    1400,
    560,
    `<div class="frame" style="padding:54px 70px;">
      <div class="grid cols-2" style="align-items:center;height:450px;">
        <section>
          <div class="brand"><div class="mark">${markSvg()}</div>AIまえチェック</div>
          <h1 style="font-size:68px;line-height:1.04;margin:34px 0 18px;font-weight:950;">AIに貼る前に、<br>消し忘れを見つける。</h1>
          <p class="lead" style="font-size:23px;">個人情報・秘密情報・APIキーを、送信前にブラウザ内で確認。</p>
        </section>
        <section class="card" style="padding:26px;">
          <div class="grid cols-3"><div class="metric risk-high">高<b>5</b></div><div class="metric risk-mid">中<b>3</b></div><div class="metric risk-low">低<b>0</b></div></div>
          <div class="preview mono" style="margin-top:18px;">[EMAIL_1] / [PHONE_1] / [PROJECT_1]</div>
        </section>
      </div>
    </div>`
  );
}

function dataImage(path) {
  const buffer = readFileSync(path);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function realExtensionScreenshot({ title, description, sourceFile, badge }) {
  const image = dataImage(resolve(outputs.readme, sourceFile));

  return htmlShell(
    1280,
    800,
    `<div class="frame" style="padding:38px 50px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:22px;">
        <div>
          <div class="brand"><div class="mark">${markSvg()}</div>AIまえチェック</div>
          <h1 style="font-size:44px;line-height:1.12;margin:20px 0 8px;font-weight:950;">${title}</h1>
          <p class="lead" style="font-size:20px;line-height:1.5;">${description}</p>
        </div>
        <div class="pill" style="font-size:16px;white-space:nowrap;">${badge}</div>
      </div>
      <div class="card" style="padding:16px;display:grid;place-items:center;height:610px;overflow:hidden;background:rgba(255,255,255,.94);">
        <img src="${image}" alt="" style="max-width:100%;max-height:578px;border-radius:10px;box-shadow:0 24px 70px rgba(24,36,31,.18);border:1px solid ${theme.line};" />
      </div>
    </div>`
  );
}

async function render(browser, html, width, height, path) {
  await mkdir(dirname(path), { recursive: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path, omitBackground: false });
  await page.close();
}

const browser = await chromium.launch();

try {
  for (const size of [16, 32, 48, 128]) {
    await render(browser, iconHtml(size), size, size, resolve(outputs.extensionIcons, `${size}.png`));
  }

  await render(browser, iconHtml(128), 128, 128, resolve(outputs.store, "icon-128.png"));
  await render(
    browser,
    realExtensionScreenshot({
      title: "貼り付け前に、安全化を確認",
      description: "ChatGPT上で表示した実機モーダルをベースに、検出項目と安全化後プレビューを見せます。",
      sourceFile: "extension-paste-modal.png",
      badge: "実機画面ベース"
    }),
    1280,
    800,
    resolve(outputs.store, "screenshot-01-real-paste-modal.png")
  );
  await render(
    browser,
    realExtensionScreenshot({
      title: "送信前に、高リスク情報を止める",
      description: "高リスクまたは秘密情報保護の対象は、安全化なしでは送信できないことを示します。",
      sourceFile: "extension-send-modal.png",
      badge: "実機画面ベース"
    }),
    1280,
    800,
    resolve(outputs.store, "screenshot-02-real-send-modal.png")
  );
  await render(
    browser,
    realExtensionScreenshot({
      title: "ルール検出がなくても、AI文脈チェックへ",
      description: "文脈によって注意が必要な内容を、ユーザー操作でブラウザ内AIチェックできます。",
      sourceFile: "extension-context-modal.png",
      badge: "実機画面ベース"
    }),
    1280,
    800,
    resolve(outputs.store, "screenshot-03-real-context-modal.png")
  );
  await render(browser, promoSmall(), 440, 280, resolve(outputs.store, "promo-small-440x280.png"));
  await render(browser, promoMarquee(), 1400, 560, resolve(outputs.store, "promo-marquee-1400x560.png"));
} finally {
  await browser.close();
}
