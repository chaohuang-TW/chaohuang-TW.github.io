(() => {
  // These are the existing data-check-item IDs, not translated display labels.
  // The isolated regression test checks each list against its lesson HTML.
  const requiredItems = Object.freeze({
    "01": Object.freeze([
      "我知道 ChatGPT 負責什麼", "我知道 Codex 負責什麼", "我知道兩者如何合作",
      "我已選擇桌面版或 CLI", "我已找到官方安裝入口", "我完成第一次只讀任務",
      "我知道 token 不應出現在公開網址或程式碼裡"
    ]),
    "02": Object.freeze([
      "分辨 GitHub 與公開網站", "理解 repository", "分辨四種網址",
      "理解 User site", "理解 Project site", "保護驗證資訊"
    ]),
    "03": Object.freeze([
      "寫出網站目的", "確認主要受眾", "確認訪客行動", "盤點內容", "安排首頁順序", "完成需求書"
    ]),
    "04": Object.freeze([
      "確認 GitHub username", "選擇 User site", "確認 owner", "確認 repository 名稱",
      "確認 main branch", "移除敏感資料", "完成只讀確認"
    ]),
    "05": Object.freeze([
      "確認 repository", "確認工作樹", "限制檔案", "完成第一版", "檢查手機", "檢查 Console", "檢查 diff"
    ]),
    "06": Object.freeze([
      "發布前檢查", "理解 Git", "敏感資訊", "建立 commit", "push main", "啟用 Pages", "驗證網址"
    ]),
    "07": Object.freeze([
      "整理 assets", "檔名規則", "圖片 alt", "圖片比例", "影音響應式", "外連安全", "手機檢查"
    ]),
    "08": Object.freeze([
      "修改前確認", "token 安全", "三個 Git 指令", "安全回復", "快取處理", "裝置檢查", "日常流程", "完成八課"
    ])
  });
  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const isChecked = (progress, item) => isRecord(progress) && hasOwn(progress, item) && progress[item] === true;
  const read = (key) => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
      // A null prototype retains old extra keys without enabling prototype setters.
      return isRecord(parsed) ? Object.assign(Object.create(null), parsed) : Object.create(null);
    } catch { return Object.create(null); }
  };
  const isComplete = (lessonNumber, progress) => {
    if (!hasOwn(requiredItems, lessonNumber)) return false;
    return requiredItems[lessonNumber].every((item) => isChecked(progress, item));
  };
  window.ChaoCourseProgress = Object.freeze({ requiredItems, isChecked, read, isComplete });
})();
