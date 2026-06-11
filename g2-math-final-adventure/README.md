# 二下數學期末大冒險

## 專案介紹

這是一個可發布到 GitHub Pages 的純前端互動網頁遊戲。孩子可以跟著小小探險家完成六個數學任務，逐步點亮期末星光城。

本專案使用純 HTML、CSS、JavaScript 製作，不需要登入、不需要後端，也不使用外部分析工具。

## 學習範圍

- 兩步驟應用問題
- 公尺和公分
- 分類與立體形體
- 平均分配與分裝
- 平分、幾分之一、簡單分數比較
- 綜合挑戰

## 如何本機開啟

方法一：直接開啟 `index.html`。

方法二：使用本機靜態伺服器。

```bash
python3 -m http.server 8000
```

接著在瀏覽器開啟：

```text
http://localhost:8000
```

## 如何部署到 GitHub Pages

1. 將本資料夾推送到 GitHub repository。
2. 進入 repository 的 `Settings`。
3. 選擇 `Pages`。
4. 在 `Build and deployment` 選擇 `Deploy from a branch`。
5. 選擇要發布的 branch。
6. 若本專案放在 repository 根目錄，資料夾選擇 `/root`。
7. 若本專案放在子資料夾，可將子資料夾內容複製到 GitHub Pages 發布來源，或改用 GitHub Actions 發布。

## 如何新增題目

題庫放在 `questions.js` 的 `MATH_QUESTIONS` 陣列中。每題格式如下：

```js
{
  id: "calc-001",
  world: "算式山丘",
  shortLabel: "算",
  skill: "先乘再加",
  type: "single-choice",
  question: "一包星星貼紙有 5 張，小宇買了 3 包，又得到 4 張。他一共有幾張貼紙？",
  choices: ["15張", "19張", "20張", "23張"],
  answer: "19張",
  explanation: "先算 5×3＝15，再算 15＋4＝19。",
  difficulty: 1
}
```

新增題目時請注意：

- 每關建議維持 10 題。
- `world` 要和 `GAME_WORLDS` 裡的關卡名稱相同。
- `answer` 必須完全對應 `choices` 中其中一個選項。
- 題目、選項與解析都應使用適合國小二年級學生理解的文字。

## 隱私說明

- 不需要登入。
- 不輸入姓名、學校、班級或座號。
- 不設排行榜。
- 不上傳作答紀錄。
- 僅使用瀏覽器 `localStorage` 儲存本機最高分與完成狀態。

## 非官方聲明

本專案為自編數學複習互動遊戲。
練習內容依據國小二年級下學期數學能力設計。
本網站非官方學習練習頁面，未使用任何教科書題目、圖片、版面或商標。
