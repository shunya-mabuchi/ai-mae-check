# Options Pageと設定設計

AIまえチェックのOptions Pageは、Chrome拡張の動作をユーザーが調整するための画面です。貼り付け本文や検出結果を保存する場所ではありません。

## 設定グループ

現在の設定は次のグループに分けます。

- 基本設定: 拡張機能全体の有効/無効
- 対象サイト: ChatGPT / Claude / GeminiごとのON/OFF
- 検出ルール: ルールベース検出ごとのON/OFF
- WebLLM: AI文脈チェックの有効/無効、モデルID、手動/自動実行
- 設定の初期化: `chrome.storage.local` に保存された設定キーの削除

## 保存するもの

設定は `chrome.storage.local` の `ai-mae-check.settings.v1` に保存します。

保存するのは次だけです。

- 拡張機能の有効/無効
- 対象サイトごとのON/OFF
- 検出ルールごとのON/OFF
- WebLLMの有効/無効
- WebLLMモデルID
- AI文脈チェックの実行モード

## 保存しないもの

- 貼り付け本文
- 送信本文
- 検出結果
- placeholderMap
- 送信履歴
- AI文脈チェックの入力本文と出力本文

## バリデーション

設定読み込み時は `normalizeSettings` で不足項目を初期値で補完します。Options Page上では `validateSettings` の結果を使い、現在の設定形式が有効かを表示します。

設定保存、読み込み、初期化でChrome storageのエラーが発生した場合は、Options Pageに日本語メッセージを表示します。エラーメッセージには貼り付け本文や検出結果を含めません。

## 初期化

「設定を初期化」を押すと、`chrome.storage.local.remove(SETTINGS_KEY)` で保存済み設定を削除し、画面を初期設定へ戻します。

本文や検出結果はそもそも保存していないため、初期化で削除する対象には含まれません。WebLLMのモデルキャッシュはChromeやWebLLMランタイムが管理する保存領域であり、この設定初期化の対象外です。

## 今後のスキーマ変更

設定項目を増やす場合は、#300 の設定スキーマ/マイグレーション方針と合わせて対応します。新しい設定を追加したら、次を更新します。

- `AiMaeCheckSettings`
- `DEFAULT_SETTINGS`
- `normalizeSettings`
- `validateSettings`
- Options Pageの表示
- `apps/extension/tests/settings.test.ts`
- プライバシー方針とREADMEの保存対象説明
