import { defineBackground } from "wxt/utils/define-background";

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void chrome.runtime.openOptionsPage();
    }
  });

  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });
});
