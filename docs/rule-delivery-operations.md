# ルール配信Worker 運用メモ

ルール配信Workerは、ユーザー本文を受け取らず、署名付きルールJSONだけを返す補助サーバーです。0.1.1では `keyId` を `ai-mae-check-rules-2026-06-v2` に更新し、本番署名付きルール配信を有効化しています。署名検証失敗時やネットワークエラー時は、拡張側が同梱ルールへフォールバックします。

## 絶対に守る方針

- ユーザー本文、送信本文、添付ファイル本文、検出結果、placeholderMap、送信履歴をWorkerへ送らない
- Worker APIは `GET /api/rules/latest` のみを使う
- リクエスト本文は使用しない
- 署名済みルールだけを拡張側で採用する
- 署名検証失敗、通信失敗、形式不正では同梱ルールだけで動く
- `privateJwk` はCloudflare Secretに保存し、Git、Issue、PR、CIログ、チャット、スクリーンショットへ残さない
- 壊れたルールや署名不正のルールを「とりあえず配信する」運用はしない

## 0.1.1の運用判断

0.1.1では、署名付きルール配信は有効化済みです。ただし、運用を複雑にしすぎないため、次の方針にします。

- リモートルールキャッシュTTLは拡張側の30分を維持する
- WorkerレスポンスのHTTP cacheは短めにし、壊れた配信を長く残さない
- ルールバンドル自体に明示的な失効時刻はまだ持たせない
- 複数バージョンのルールを拡張側に永続保持しない
- 署名検証済みの直近ルールだけを短時間キャッシュする
- ルールバンドルには明示的な `expiresAt` を入れ、署名検証後に期限切れバンドルを採用しない
- 署名検証に失敗したルールはキャッシュしない
- ルールカタログ拡充は、fixture、ReDoS観点、誤検出観点、ストア説明への影響を確認してから行う

この判断により、0.1.1では「配信で検出対象を増やせる」こと、「期限切れルールを採用しない」こと、「壊れた配信時に同梱ルールへ戻れる」ことを優先します。複数バージョン保持や配信停止フラグは、実運用で必要になった段階で追加します。

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
- `minExtensionVersion` を上げる場合は、古い拡張で使えない理由をPRに書く
- ルールIDは後方互換性のため安定させ、意味が変わる場合は新しいIDを作る

検出ルール作成ガイド、同梱ルールカタログ、命名規則、誤検出を避けるレビュー観点は [detection-rule-authoring.md](./detection-rule-authoring.md) を参照してください。

## keyId管理

`keyId` は「どの公開鍵で検証する署名か」を表します。

運用ルール:

- `keyId` は拡張に埋め込まれる公開JWKとセットで扱う
- 公開済み拡張に埋め込まれた公開鍵は後から変更できない
- `keyId` または公開JWKを変える場合は、Chrome Web Storeへ新バージョンを提出する
- Worker側の `RULE_KEY_ID` は、現在署名に使う鍵の `keyId` と一致させる
- 拡張側の `apps/extension/config/rule-delivery.release.json` には、現行鍵を `keyId` / `publicJwk` として持ち、ローテーション期間は `publicKeys` に旧鍵と新鍵を並べる
- `keyId` の例は `ai-mae-check-rules-2026-06-v2` のように、用途、年月、世代が分かる名前にする

0.1.1以降の拡張は、`publicKeys` に含まれる複数の公開鍵から、署名バンドルの `keyId` に一致する鍵を選んで検証できます。Workerは常に現在の `RULE_KEY_ID` と `RULE_SIGNING_PRIVATE_JWK` の1組で署名します。

## 鍵管理

鍵ペア生成:

```bash
pnpm rules:keygen -- --key-id ai-mae-check-rules-2026-06-v2 --private-out ../ai-mae-check-rules-2026-06-v2.private.jwk.json
```

保存先:

- `publicJwk`: `apps/extension/config/rule-delivery.release.json` の現行鍵
- `publicKeys`: `apps/extension/config/rule-delivery.release.json` の検証可能な鍵一覧
- `privateJwk`: Cloudflare Pages Production Secret `RULE_SIGNING_PRIVATE_JWK`
- `keyId`: Cloudflare Pages Production環境の `RULE_KEY_ID` と拡張側設定を一致させる

注意:

- `privateJwk` は再表示できる前提で扱わない
- `privateJwk` をファイルとして保存する場合は、Git管理外の一時保管に限り、作業完了後に削除する
- `privateJwk` をターミナル履歴、PowerShell履歴、Issue、PR、レビューコメント、スクリーンショット、CIログへ残さない
- `privateJwk` はマスク済みであってもログ出力しない
- 紛失した場合は鍵ペアを再発行し、拡張側公開鍵も更新する
- 秘密鍵流出が疑われる場合は、リモートルール配信を一時停止し、新しい鍵ペアで0.1.1以降の新バージョンを提出する

## 通常のルール更新手順

1. 追加したいルールを `functions/api/rules/latest.ts` のルールバンドルへ反映する
2. `payload.version` を上げる
3. 正規表現が過剰検出やReDoSにつながらないかレビューする
4. ユーザー本文や実Secretをテストデータへ入れていないことを確認する
5. `pnpm test:worker` を実行する
6. Cloudflare PagesのPreviewでAPIレスポンスを確認する
7. mainへマージしてProductionへデプロイする
8. 本番 `GET /api/rules/latest` の `version`、`keyId`、`signature` を確認する

Cloudflare PagesのSecretを追加・更新した場合は、既存のProduction deploymentではなく、Secret保存後に作成されたProduction deploymentで確認します。

確認例:

```powershell
Invoke-RestMethod -Uri https://ai-mae-check.pages.dev/api/rules/latest
```

拡張側に埋め込んだ公開鍵と本番APIの署名が一致するかは、次のQAで確認します。

```bash
pnpm qa:rules:production
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

1. 問題のある `payload.version` とCloudflare PagesのデプロイIDを特定する
2. 問題ルールを削除または修正するPRを作る
3. `payload.version` を新しい値へ上げる
4. `pnpm test:worker` を実行する
5. mainへマージし、Productionへデプロイする
6. 本番APIで `payload.version` と `signature` を確認する
7. 拡張側で同梱ルールまたは修正済みリモートルールにより、対象入力が期待どおり検出されることを確認する

緊急ロールバック:

1. Cloudflare Pagesのデプロイ履歴から直前の正常デプロイへ戻す
2. 直前デプロイでも危険な場合は、リモートルール配信を一時停止する
3. 一時停止時は、署名なしや壊れたJSONを返さず、拡張側が同梱ルールへフォールバックできる失敗状態にする
4. 復旧PRで原因、影響範囲、再発防止を記録する

一時停止の考え方:

- Secret未設定や署名設定エラーでAPIが失敗しても、拡張側は同梱ルールで動き続ける
- リモートルールを無理に返すより、署名検証に失敗させて採用されない状態の方が安全
- 障害調査ログへユーザー本文を含めない

## 鍵ローテーション手順

計画的な鍵ローテーション:

1. 新しい `keyId` を決める
2. `pnpm rules:keygen -- --key-id <new-key-id> --private-out <git管理外の一時ファイル>` で新しい鍵ペアを生成する
3. `apps/extension/config/rule-delivery.release.json` の `publicKeys` に新しい公開鍵を追加し、ローテーション期間は旧公開鍵も残す
4. Worker側を切り替える前に、旧鍵と新鍵の両方を検証できる拡張バージョンをChrome Web Storeへ提出する
5. 公開が進んだら、Worker側の `RULE_KEY_ID` とCloudflare Pages Production Secret `RULE_SIGNING_PRIVATE_JWK` を新しい鍵へ更新する
6. 現行鍵として扱うタイミングで、`keyId` / `publicJwk` を新鍵へ更新する
7. `pnpm test:worker`、`pnpm build:extension`、`pnpm package:extension`、`pnpm qa:extension:manifest`、`pnpm qa:chrome-store`、`pnpm qa:rules:production` を実行する
8. 十分な移行期間後、次の拡張バージョンで古い公開鍵を `publicKeys` から外す

注意:

- 0.1.0のように新鍵を知らない拡張は、新鍵へ切り替えたルール配信を採用できず同梱ルールへフォールバックする
- その状態は安全側の失敗ですが、追加リモートルールは効かなくなるため、切り替えタイミングをREADMEやRelease noteに記録する
- `publicKeys` には公開鍵だけを置き、`privateJwk` を含めない

秘密鍵流出が疑われる場合:

1. リモートルール配信を一時停止する
2. 既存 `privateJwk` をCloudflare Secretから削除または無効化する
3. 新しい鍵ペアを生成する
4. 新しい公開鍵を含む拡張バージョンを作成する
5. Chrome Web Storeへ緊急更新として提出する
6. GitHub IssueやRelease noteには、秘密鍵そのものではなく「鍵をローテーションした事実」と影響範囲だけを書く

## 署名検証失敗時の拡張側挙動

現在の方針:

- 通信失敗、HTTPエラー、JSON形式不正、署名欠落、署名不一致、`keyId` 不一致ではリモートルールを採用しない
- 署名検証に成功しても、payloadの `generatedAt` が未来すぎる場合や `expiresAt` が期限切れの場合は採用しない
- 同梱ルールベース検出は継続する
- 通信失敗またはHTTPエラーの場合は、最後に検証済みの署名付きリモートルールキャッシュを短時間だけ利用できる
- キャッシュ採用時も、署名、`keyId`、schema、`version`、`generatedAt`、`expiresAt`、有効期限を再確認する
- JSON形式不正、署名欠落、署名不一致、未知の `keyId` など、取得したバンドル自体が信用できない場合はキャッシュを消して同梱ルールへ戻る
- キャッシュは `chrome.storage.local` の `ai-mae-check.remoteRules.v1` に保存し、貼り付け本文、送信本文、検出結果、placeholderMap、送信履歴は含めない

将来検討:

- キャッシュTTLを運用実績に合わせて調整する
- 複数バージョンのキャッシュ保持が必要か検討する
- 配信停止フラグを持たせる必要があるか検討する

## 障害時の見え方

- Workerが落ちている場合: 期限内かつ `expiresAt` 内の検証済みキャッシュがあれば採用し、なければ同梱ルールへフォールバックする
- Secret未設定の場合: APIは署名設定なしのエラーを返す
- 署名不一致の場合: 拡張側はリモートルールを採用せず、キャッシュも使わず同梱ルールへ戻る
- `expiresAt` 期限切れの場合: 拡張側はリモートルールを採用せず、キャッシュも使わず同梱ルールへ戻る
- 壊れたルールを正しく署名してしまった場合: ルール内容のロールバックが必要

いずれの場合も、ルールベースの同梱検出は継続します。ユーザー本文は障害調査ログへ含めません。
