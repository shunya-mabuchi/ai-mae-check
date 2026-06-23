# ルール配信Worker 運用メモ

ルール配信Workerは、ユーザー本文を受け取らず、署名付きルールJSONだけを返すための補助サーバーです。0.1.0では本番署名鍵が未設定のため、同梱ルールへフォールバックする状態です。0.1.1では `keyId` を `ai-mae-check-rules-2026-06-v2` に更新し、新しい鍵ペアで有効化します。

## 絶対に守る方針

- ユーザー本文、送信本文、添付ファイル本文、検出結果、placeholderMap、送信履歴をWorkerへ送らない
- Worker APIは `GET /api/rules/latest` のみを使う
- リクエスト本文は使用しない
- 署名済みルールだけを拡張側で採用する
- 署名検証失敗、通信失敗、形式不正では同梱ルールだけで動く
- `privateJwk` はCloudflare Secretに保存し、Git、Issue、PR、CIログ、PowerShell履歴、チャット、レビューコメント、スクリーンショットへ残さない
- 壊れたルールや署名不正のルールを「とりあえず配信する」運用はしない

## ルールバージョン管理

ルールバンドルの `payload.version` は、配信内容の追跡とロールバック判断に使います。

推奨形式:

```text
YYYY.MM.DD.N
```

例:

```text
2026.06.23.1
```

運用ルール:

- 同じ内容を再配信する場合は同じ `version` のままにする
- ルールの追加、削除、pattern変更、riskLevel変更、message変更では `version` を上げる
- `generatedAt` はビルドまたは配信生成時刻を入れる
- `minExtensionVersion` を上げる場合は、古い拡張で使えない理由をPRに明記する
- ルールIDは後方互換性のため安定させ、意味が変わる場合は新しいIDを作る

## keyId管理

`keyId` は「どの公開鍵で検証すべき署名か」を表します。

運用ルール:

- `keyId` は拡張に埋め込まれる公開JWKとセットで扱う
- 公開済み拡張に埋め込まれた公開鍵は後から変更できない
- `keyId` または公開JWKを変える場合は、Chrome Web Storeへ新バージョンを提出する
- Worker側の `RULE_KEY_ID` と拡張側の `apps/extension/config/rule-delivery.release.json` の `keyId` を一致させる
- `keyId` の例は `ai-mae-check-rules-2026-06-v1` のように、用途、年月、世代が分かる名前にする

現在の実装は単一鍵の署名を前提にしています。複数鍵で同時に署名して旧拡張と新拡張へ滑らかに移行する仕組みは未実装です。そのため、鍵を切り替えた直後は、旧バージョンの拡張では署名検証に失敗し、同梱ルールへフォールバックする可能性があります。

## 鍵管理

鍵ペア生成:

```bash
pnpm rules:keygen -- --key-id ai-mae-check-rules-2026-06-v2 --private-out ../ai-mae-check-rules-2026-06-v2.private.jwk.json
```

このコマンドは `publicJwk` を標準出力し、`privateJwk` は指定したファイルに保存します。`--include-private` を付けると `privateJwk` も標準出力できますが、本番鍵では使わないでください。

保存先:

- `publicJwk`: `apps/extension/config/rule-delivery.release.json`
- `privateJwk`: Cloudflare Pages Production Secret `RULE_SIGNING_PRIVATE_JWK`
- `keyId`: Cloudflare Pages Production環境の `RULE_KEY_ID` と拡張側設定を一致させる

注意:

- `privateJwk` は再表示できる前提で扱わない
- `privateJwk` をファイルとして保存する場合は、Git管理外の一時保管に限り、作業完了後に削除する
- `privateJwk` をターミナル履歴、PowerShell履歴、Issue、PR、Slack、チャット、レビューコメント、スクリーンショット、CIログへ残さない
- `privateJwk` はマスク済みであってもログ出力しない
- 紛失した場合は鍵ペアを再発行し、拡張側公開鍵も更新する
- 秘密鍵流出が疑われる場合は、リモートルール配信を一時停止し、新しい鍵ペアで0.1.1以降の新バージョンを提出する

## 通常のルール更新手順

1. 追加したいルールを `functions/api/rules/latest.ts` のルールバンドルへ反映する。
2. `payload.version` を上げる。
3. 正規表現が過剰検出やReDoSに寄らないかレビューする。
4. ユーザー本文や実在の秘密情報をテストデータへ入れていないことを確認する。
5. `pnpm test:worker` を実行する。
6. Cloudflare PagesのプレビューでAPIレスポンスを確認する。
7. mainへマージしてProductionへデプロイする。
8. 本番 `GET /api/rules/latest` の `version`、`keyId`、`signature` を確認する。

Cloudflare PagesのSecretを追加・更新した場合は、既存のProduction deploymentではなく、Secret保存後に作成されたProduction deploymentで確認します。保存直後に本番APIが503を返す場合は、Production再デプロイが反映されているかを先に確認します。

本番APIの `keyId` が古い値のままだと、署名検証はできても拡張側の期待する `keyId` と一致せず、リモートルールは採用されません。`RULE_KEY_ID` もProduction環境で明示的に更新します。

確認例:

```powershell
Invoke-RestMethod -Uri https://ai-mae-check.pages.dev/api/rules/latest
```

期待する状態:

- `alg` が `ECDSA-P256-SHA256`
- `keyId` が拡張側設定と一致する
- `payload.version` が想定した値になっている
- `payload.rules` が配列になっている
- `signature` が空ではない

## 壊れたルール配信時のロールバック

壊れたルールの例:

- 誤検出が多すぎる正規表現を配信した
- `riskLevel` や `category` を誤って上げた
- JSON形式やschemaVersionを壊した
- 署名は正しいが、ルール内容がユーザー体験を悪化させている

標準ロールバック:

1. 問題のある `payload.version` とCloudflare PagesのデプロイIDを特定する。
2. 問題ルールを削除または修正するPRを作る。
3. `payload.version` を新しい値へ上げる。
4. `pnpm test:worker` を実行する。
5. mainへマージし、Productionへデプロイする。
6. 本番APIで `payload.version` と `signature` を確認する。
7. 拡張側で同梱ルールまたは修正済みリモートルールにより、対象入力が期待どおり検出されることを確認する。

緊急ロールバック:

1. Cloudflare Pagesのデプロイ履歴から直前の正常デプロイへ戻す。
2. 直前デプロイでも危険な場合は、リモートルール配信を一時停止する。
3. 一時停止時は、署名なしや壊れたJSONを返さず、拡張側が同梱ルールへフォールバックできる失敗状態にする。
4. 復旧PRで原因、影響範囲、再発防止を記録する。

一時停止の考え方:

- Secret未設定や署名設定エラーでAPIが失敗しても、拡張側は同梱ルールで動き続ける
- リモートルールを無理に返すより、署名検証に失敗させて採用されない状態の方が安全
- 障害調査ログへユーザー本文を含めない

## 鍵ローテーション手順

計画的な鍵ローテーション:

1. 新しい `keyId` を決める。
2. `pnpm rules:keygen -- --key-id <new-key-id> --private-out <git管理外の一時ファイル>` で新しい鍵ペアを生成する。
3. `publicJwk` と `keyId` を `apps/extension/config/rule-delivery.release.json` へ反映する。
4. Worker側の `RULE_KEY_ID` を同じ `keyId` へ更新する。
5. Cloudflare Pages Production Secret `RULE_SIGNING_PRIVATE_JWK` に新しい `privateJwk` を設定する。
6. `pnpm test:worker`、`pnpm build:extension`、`pnpm package:extension`、`pnpm qa:extension:manifest`、`pnpm qa:chrome-store` を実行する。
7. Chrome Web Storeへ新バージョンとして提出する。
8. 公開後、本番APIの `keyId` と拡張側埋め込み公開鍵が一致することを確認する。

注意:

- 現在の実装では、旧公開鍵と新公開鍵の同時受け入れはありません
- Worker側だけ先に新鍵へ切り替えると、旧拡張はリモートルールを採用できず同梱ルールへフォールバックする
- その状態は安全側の失敗ですが、追加リモートルールは効かなくなるため、公開タイミングをREADMEやRelease noteに記録する

秘密鍵流出が疑われる場合:

1. リモートルール配信を一時停止する。
2. 既存 `privateJwk` をCloudflare Secretから削除または無効化する。
3. 新しい鍵ペアを生成する。
4. 新しい公開鍵を含む拡張バージョンを作成する。
5. Chrome Web Storeへ緊急更新として提出する。
6. GitHub IssueやRelease noteには、秘密鍵そのものではなく「鍵をローテーションした事実」と影響範囲だけを書く。

## 署名検証失敗時の拡張側挙動

現在の方針:

- 通信失敗、HTTPエラー、JSON形式不正、署名欠落、署名不一致、`keyId` 不一致ではリモートルールを採用しない
- 同梱ルールベース検出は継続する
- リモートルールは初期実装では永続保存しない
- 最後に検証済みのリモートルールをキャッシュして使い続ける機能は未実装

将来検討:

- 最後に検証済みのルールだけを短期間キャッシュする
- キャッシュにも署名検証結果、`version`、`generatedAt`、有効期限を持たせる
- 古すぎるルールは採用せず、同梱ルールへ戻す

## 障害時の見え方

- Workerが落ちている場合: 拡張側は同梱ルールへフォールバックする
- Secret未設定の場合: APIは署名設定なしのエラーを返す
- 署名不一致の場合: 拡張側はリモートルールを採用しない
- 壊れたルールを正しく署名してしまった場合: ルール内容のロールバックが必要

いずれの場合も、ルールベースの同梱検出は継続します。ユーザー本文は障害調査ログへ含めません。
