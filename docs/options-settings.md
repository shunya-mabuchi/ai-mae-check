# Options Pageと設定設計

AIまえチェックのOptions Pageは、Chrome拡張の動作をユーザーが調整するための画面です。貼り付け本文、送信本文、検出結果、placeholderMapを保存する場所ではありません。

## 設定グループ

- 基本設定: 拡張機能全体の有効/無効
- 対象サイト: ChatGPT / Claude / Gemini / PerplexityごとのON/OFF
- 検出ルール: ルールベース検出ごとのON/OFF
- WebLLM: AI文脈チェックの有効/無効、モデルID、手動/自動実行
- 設定の初期化: `chrome.storage.local` に保存された設定キーと検証済みリモートルールキャッシュの削除
- 診断情報: 本文を含まない設定状態と環境情報のコピー

## 保存するもの

設定は `chrome.storage.local` の `ai-mae-check.settings.v1` に保存します。保存する設定オブジェクトには `settingsVersion` を持たせます。

保存対象は次だけです。

- `settingsVersion`
- 拡張機能の有効/無効
- 対象サイトごとのON/OFF
- 検出ルールごとのON/OFF
- WebLLMの有効/無効
- WebLLMモデルID
- AI文脈チェックの実行モード

ルール配信を有効にしている場合、最後に検証済みの署名付きリモートルールだけを `chrome.storage.local` の `ai-mae-check.remoteRules.v1` に短時間キャッシュします。このキャッシュには、署名付きルールJSON、`keyId`、`version`、`generatedAt`、`cachedAt`、`expiresAt` だけを含めます。

## 保存しないもの

- 貼り付け本文
- 送信本文
- 検出結果
- placeholderMap
- 送信履歴
- AI文脈チェックの入力本文や出力本文
- ファイル本文

## スキーマとマイグレーション

現在の設定スキーマは `SETTINGS_SCHEMA_VERSION = 1` です。

`normalizeSettings` / `migrateSettings` は、未設定、古い設定、壊れた設定を現在のスキーマへ補完します。

- `settingsVersion` がない古い設定は、現在の `settingsVersion` を付与します
- 不足した対象サイトや検出ルールは初期値で補完します
- 不正な型の値は初期値へ戻します
- 未知のキーは保存対象に含めません
- 本文らしきキーが混ざっていても、正規化後の設定には残しません

`loadSettings` は保存値を必ず `normalizeSettings` に通して返します。`saveSettings` は保存前に正規化し、保存対象を設定だけに限定します。

## 初期化

「設定を初期化」を押すと、`chrome.storage.local.remove([SETTINGS_KEY, REMOTE_RULE_CACHE_KEY])` で保存済み設定と検証済みリモートルールキャッシュを削除し、画面を初期設定へ戻します。

本文や検出結果はそもそも保存していないため、初期化で削除する対象には含まれません。WebLLMのモデルキャッシュはChromeやWebLLMランタイムが管理する保存領域であり、この設定初期化の対象外です。

## 関連ファイル

- `apps/extension/src/lib/settings.ts`
- `apps/extension/src/lib/remoteRuleCache.ts`
- `apps/extension/tests/settings.test.ts`
- `docs/privacy-regression.md`
- `scripts/check-privacy-regression.mjs`
