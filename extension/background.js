// The app needs a full tab (wide table, long scans); a popup would close and abort a scan on blur.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
