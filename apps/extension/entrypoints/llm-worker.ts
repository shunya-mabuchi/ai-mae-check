import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import "../../../packages/llm/src/worker";

export default defineUnlistedScript(() => {
  // Worker本体は上のside effect importでメッセージ待受を開始します。
});
