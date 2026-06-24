# テスト保守方針

最終更新日: 2026-06-24

AIまえチェックでは、DLP判定、WebLLM、Chrome拡張の送信前介入を小さな単位で検証します。テストが大きくなりすぎると、ユーザーシナリオ、異常系、WebLLMの状態遷移が読み取りにくくなるため、分割基準を明文化します。

## 基本方針

- テスト名は、実装都合ではなくユーザーが遭遇するシナリオを表す。
- 共有fixtureは増やしすぎず、読み手が入力、操作、期待結果を追える範囲に留める。
- WebLLM実モデルロードは通常テストに含めず、モックと実機確認メモで分ける。
- Chrome拡張E2Eは、対象サイトの実DOMではなくmock composerで安定シナリオを守る。
- 肥大化したテストは、シナリオ単位に分割する。

## 2026-06-24時点の判断

現時点では、次の大きいテストを今すぐ物理分割しない判断にします。理由は、直近でE2E CIをPR必須相当に昇格したばかりで、まず安定性を観測したいこと、また分割だけで大きな差分を作るより、次にシナリオを追加するタイミングで責務別に切る方が安全なためです。

ただし、これ以上自然に増え続けないよう、`pnpm qa:test-maintenance` で行数予算を置きます。予算を超える場合は、上限を上げるのではなく先に分割を検討します。

| ファイル | 現在の役割 | 上限 | 分割する場合の単位 |
| --- | --- | ---: | --- |
| `apps/extension/tests/llmBridgePage.test.ts` | LLM bridge pageの起動、リクエスト、異常系 | 450行 | lifecycle / request handling / error handling |
| `packages/llm/tests/llm.test.ts` | WebLLM周辺の統合的なユニット検証 | 440行 | parser / candidate conversion / analyzer fallback |
| `apps/extension/e2e/extension.spec.ts` | mock composer上の拡張E2E | 390行 | paste scenarios / submit scenarios / keyboard scenarios |
| `packages/llm/tests/runtimeService.test.ts` | LocalLlmRuntimeServiceの状態管理 | 330行 | prepare / analyze / error state |

## 分割する条件

- 新しいシナリオ追加で上限を超える。
- 1つのテストファイルに、正常系、異常系、UI状態、データ変換が混在し始める。
- 失敗時にどの責務が壊れたか分かりにくくなる。
- fake DOMやbridge fixtureを複数ファイルで再利用したくなる。

## 分割しない条件

- 同じsetupを分割することで、逆にテストの読み取り負荷が上がる。
- 直近のCI安定性確認中で、テストファイル移動によるノイズが大きい。
- シナリオが同じユーザー操作の連続として読めた方が分かりやすい。

この方針は、テスト分割を先送りするためではなく、分割タイミングを明確にするためのものです。
