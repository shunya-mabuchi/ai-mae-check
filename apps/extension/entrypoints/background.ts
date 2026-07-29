import { defineBackground } from "wxt/utils/define-background";
import { RULE_DELIVERY_ENDPOINT } from "../src/lib/remoteRuleDelivery";
import {
  isRemoteRuleFetchRequest,
  type RemoteRuleFetchResponse
} from "../src/lib/remoteRuleTransport";

const jsonContentType = "application/json";

function rejectedResponse(status: number): RemoteRuleFetchResponse {
  return {
    ok: false,
    status,
    body: "",
    contentType: jsonContentType
  };
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void chrome.runtime.openOptionsPage();
    }
  });

  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isRemoteRuleFetchRequest(message)) {
      return false;
    }

    if (!RULE_DELIVERY_ENDPOINT || message.endpoint !== RULE_DELIVERY_ENDPOINT) {
      sendResponse(rejectedResponse(403));
      return false;
    }

    void fetch(message.endpoint, {
      method: "GET",
      headers: { accept: jsonContentType },
      cache: "no-store"
    }).then(async (response) => {
      const result: RemoteRuleFetchResponse = {
        ok: response.ok,
        status: response.status,
        body: await response.text(),
        contentType: response.headers.get("content-type") ?? jsonContentType
      };
      sendResponse(result);
    }).catch(() => {
      sendResponse(rejectedResponse(503));
    });

    return true;
  });
});
