# 員工特約優惠專區維護說明

1. `assets/data/staff-benefits/benefits.json` 是網站唯一資料母檔。
2. 現有資料由人工整理，與 Notion 不會同步；六堆伙房資料為使用者明確確認。
3. 更新流程：
   - 從 Notion 下載最新 `benefits.json`。
   - 覆蓋 `assets/data/staff-benefits/benefits.json`。
   - 執行資料驗證。
   - 本機預覽。
   - commit 與 push。
4. 網站只顯示同時符合 `publicationStatus: published` 與 `verificationStatus: confirmed` 的優惠；目前 10 筆皆經使用者確認公開。
5. `noindex` 不是權限控管。GitHub Pages 上的頁面與 JSON 都是公開資源。
6. 不得把 PDF、DOCX、簽呈或內部資料放進 repository。
7. 本機預覽：在 repository 根目錄執行 `python3 -m http.server 8000`，再開啟 `http://localhost:8000/staff-benefits/`。
8. 驗證 JSON：在 repository 根目錄執行 `node staff-benefits/validate-benefits.mjs`。
9. 撤回單一優惠：修改該筆 `publicationStatus`，再重新驗證及發布。不要刪除歷史資料，除非確有必要。
10. 本頁刻意不載入 GA4 或其他外部分析服務，也不列入首頁、Brand Hub 或 sitemap。
