import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import "@ai-mae-check/llm/worker";

export default defineUnlistedScript(() => {
  // WebLLM Worker本体はside effect importでメッセージ処理を登録します。
});
