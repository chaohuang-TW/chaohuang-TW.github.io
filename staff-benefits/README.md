# 員工特約優惠專區維護說明

1. `benefits.json` 的來源為人工由 Notion 下載。
2. Notion 與 GitHub 不會同步。
3. 更新流程：
   - 從 Notion 下載最新 `benefits.json`。
   - 覆蓋 `assets/data/staff-benefits/benefits.json`。
   - 執行資料驗證。
   - 本機預覽。
   - commit 與 push。
4. 網站只顯示 `publicationStatus === "published"` 且 `verificationStatus === "confirmed"` 的項目。
5. `noindex` 不是權限控管。GitHub Pages 上的頁面與 JSON 都是公開資源。
6. 不得把 PDF、DOCX、簽呈或內部資料放進 repository。
7. 本機預覽：在 repository 根目錄執行 `python3 -m http.server 8000`，再開啟 `http://localhost:8000/staff-benefits/`。
8. 驗證 JSON：在 repository 根目錄執行 `node staff-benefits/validate-benefits.mjs`。
9. 撤回單一優惠：修改該筆 `publicationStatus`，再重新驗證及發布。不要刪除歷史資料，除非確有必要。
