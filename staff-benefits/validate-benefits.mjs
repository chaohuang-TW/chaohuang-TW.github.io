import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FILE = path.resolve("assets/data/staff-benefits/benefits.json");
const file = path.resolve(process.argv[2] || DEFAULT_FILE);
const errors = [];
const warnings = [];
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
}).format(new Date());

const approvedSensitiveTexts = new Set([
  "已排除 PDF／DOCX、簽呈背景、比價過程、內部人名、簽署資訊、公司統編、簽章及不宜公開資料。",
  "入住時出示館方要求之員工身分證明",
  "入住時出示員工證或名片及身分證；未提供身分證明須補足房價差額",
  "本國籍承租人攜帶有效身分證及駕照正本",
  "已排除雙方統編、基金承辦人、飯店業務代表、主管姓名、內部分機、個人業務信箱及簽章資料",
  "user-provided-signed-contract",
]);

const sensitivePattern = /internalNotes?|private|confidential|approval|signer|signature|contractFile|attachment|pdf|docx|taxId|統一編號|統編|簽呈|簽署人|承辦人|內部聯絡人|內部電話|比價|採購|核准|簽章|身分證|銀行帳號|私人手機|個人Email|Notion內部網址|file:\/\/|attachment:/i;
const executablePattern = /<\s*(script|iframe)\b|\bon\w+\s*=|javascript\s*:|data\s*:/i;
const urlPattern = /\b([a-z][a-z0-9+.-]*):\/\/[^\s]+/gi;
const privateNotionPattern = /https?:\/\/(?:www\.)?notion\.(?:so|site)\/|https?:\/\/[^\s]*amazonaws\.com\/[^\s]*notion/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateKeyPattern = /^(from|to|lastVerified|lastUpdated|updatedAt|generatedAt)$/;

function issue(message) {
  errors.push(message);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function walk(value, segments = []) {
  const location = segments.join(".");
  const key = String(segments.at(-1) ?? "");

  if (key && sensitivePattern.test(key)) {
    issue(`敏感 key：${location}`);
  }

  if (typeof value === "string") {
    const sensitiveMatch = value.match(sensitivePattern);
    if (sensitiveMatch) {
      if (approvedSensitiveTexts.has(value)) {
        warnings.push(`已核准敏感字詞例外：${location}`);
      } else {
        issue(`敏感文字：${location}（值未輸出）`);
      }
    }
    if (executablePattern.test(value) || /<\s*\/?[a-z][^>]*>/i.test(value)) {
      issue(`可執行或 HTML 文字：${location}`);
    }
    if (privateNotionPattern.test(value)) issue(`Notion 私人網址：${location}`);

    for (const match of value.matchAll(urlPattern)) {
      const protocol = match[1].toLowerCase();
      if (protocol !== "http" && protocol !== "https") {
        issue(`不安全 URL 協定：${location}`);
      }
    }

    if (dateKeyPattern.test(key) && !isValidDate(value)) {
      issue(`日期格式異常：${location}`);
    }
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, [...segments, String(index)]));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      walk(childValue, [...segments, childKey]);
    });
  }
}

let raw;
let data;
try {
  const bytes = await readFile(file);
  raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  data = JSON.parse(raw);
} catch (error) {
  console.error(`驗證失敗：JSON 無法以 UTF-8 正常解析（${error.message}）`);
  process.exit(1);
}

if (!data || typeof data !== "object" || Array.isArray(data)) issue("頂層必須是物件");
if (!data.meta || typeof data.meta !== "object") issue("缺少 meta 物件");
if (!Array.isArray(data.benefits)) issue("benefits 必須是陣列");

const benefits = Array.isArray(data.benefits) ? data.benefits : [];
const ids = new Set();
const slugs = new Set();
const duplicateIds = [];
const duplicateSlugs = [];
const missingPublicationFields = [];

for (const [index, benefit] of benefits.entries()) {
  const prefix = `benefits.${index}`;
  if (!benefit || typeof benefit !== "object" || Array.isArray(benefit)) {
    issue(`${prefix} 必須是物件`);
    continue;
  }
  if (!benefit.id && !benefit.slug) issue(`${prefix} 缺少 id 或 slug`);
  if (benefit.id) {
    if (ids.has(benefit.id)) duplicateIds.push(benefit.id);
    ids.add(benefit.id);
  }
  if (benefit.slug) {
    if (slugs.has(benefit.slug)) duplicateSlugs.push(benefit.slug);
    slugs.add(benefit.slug);
  }
  for (const required of ["name", "category", "publicationStatus", "verificationStatus"]) {
    if (typeof benefit[required] !== "string" || !benefit[required].trim()) {
      issue(`${prefix}.${required} 不得為空`);
      if (["publicationStatus", "verificationStatus"].includes(required)) missingPublicationFields.push(`${prefix}.${required}`);
    }
  }
  if (![benefit.featuredText, benefit.summary].some((entry) => typeof entry === "string" && entry.trim())) {
    issue(`${prefix} 顯示項目缺少主要優惠`);
  }
  for (const [columnsKey, rowsKey] of [["rateColumns", "roomRates"], ["vehicleRateColumns", "vehicleRates"]]) {
    if (benefit[rowsKey] !== undefined) {
      if (!Array.isArray(benefit[columnsKey]) || !Array.isArray(benefit[rowsKey])) {
        issue(`${prefix}.${rowsKey} 價格表結構不完整`);
      } else {
        benefit[rowsKey].forEach((row, rowIndex) => {
          if (!Array.isArray(row) || row.length !== benefit[columnsKey].length) {
            issue(`${prefix}.${rowsKey}.${rowIndex} 欄位數不一致`);
          }
          row?.forEach((cell, cellIndex) => {
            if (cell === null || cell === undefined || cell === "") {
              issue(`${prefix}.${rowsKey}.${rowIndex}.${cellIndex} 價格資料為空`);
            }
            if (typeof cell === "number" && !Number.isFinite(cell)) {
              issue(`${prefix}.${rowsKey}.${rowIndex}.${cellIndex} 金額無效`);
            }
          });
        });
      }
    }
  }
  if (benefit.contact?.email && !emailPattern.test(benefit.contact.email)) {
    issue(`${prefix}.contact.email 格式異常`);
  }
  if (benefit.contact?.phone && !/[0-9]/.test(benefit.contact.phone)) {
    issue(`${prefix}.contact.phone 格式異常`);
  }
  if (benefit.contact?.website && !/^https?:\/\/[^\s]+$/i.test(benefit.contact.website)) {
    issue(`${prefix}.contact.website 只允許 http 或 https`);
  }
}

if (duplicateIds.length) issue(`重複 id：${duplicateIds.join(", ")}`);
if (duplicateSlugs.length) issue(`重複 slug：${duplicateSlugs.join(", ")}`);

walk(data);

const publicBenefits = benefits.filter(
  (benefit) => benefit.publicationStatus === "published" && benefit.verificationStatus === "confirmed",
);
const hiddenBenefits = benefits.filter((benefit) => !publicBenefits.includes(benefit));
const displayBenefits = publicBenefits;
const publishedCount = benefits.filter((benefit) => benefit.publicationStatus === "published").length;
const confirmedCount = benefits.filter((benefit) => benefit.verificationStatus === "confirmed").length;
const categories = new Map();
for (const benefit of displayBenefits) categories.set(benefit.category, (categories.get(benefit.category) || 0) + 1);

const displayExpiries = displayBenefits
  .flatMap((benefit) => {
    const validity = benefit.validity || {};
    return [validity.to, validity.chengYiHotel?.to, validity.hotelday?.to].filter(Boolean);
  })
  .sort();
const noExpiry = displayBenefits.filter((benefit) => {
  const validity = benefit.validity || {};
  return !validity.to && !validity.chengYiHotel?.to && !validity.hotelday?.to;
});
const expiredDisplay = displayBenefits.filter((benefit) => benefit.validity?.to && benefit.validity.to < today);
if (expiredDisplay.length) warnings.push(`已公開但原始期限已過：${expiredDisplay.map((benefit) => benefit.name).join("、")}`);

const fullonErrorStart = errors.length;
const fullonMatches = benefits.filter((benefit) =>
  benefit.id === "fullon-hotel-kaohsiung"
  || benefit.slug === "fullon-hotel-kaohsiung"
  || benefit.name === "福容大飯店高雄"
);
if (fullonMatches.length !== 1) issue(`福容大飯店高雄筆數應為 1，目前為 ${fullonMatches.length}`);
if (fullonMatches.length === 1) {
  const benefit = fullonMatches[0];
  const serialized = JSON.stringify(benefit);
  const normalized = serialized.replace(/\s+/g, "");
  if (benefit.publicationStatus !== "published") issue("福容大飯店高雄 publicationStatus 必須為 published");
  if (benefit.verificationStatus !== "confirmed") issue("福容大飯店高雄 verificationStatus 必須為 confirmed");
  if (!String(benefit.featuredText || "").includes("2,700") || !String(benefit.featuredText || "").includes("3,500")) {
    issue("福容大飯店高雄 featuredText 必須包含 2,700 與 3,500");
  }
  if (benefit.validity?.from !== "2026-07-03") issue("福容大飯店高雄開始日期必須為 2026-07-03");
  if (benefit.validity?.to !== "2026-12-30") issue("福容大飯店高雄結束日期必須為 2026-12-30");
  if (!Array.isArray(benefit.properties) || benefit.properties.length !== 2) {
    issue("福容大飯店高雄 properties 必須為 2 組");
  }

  const businessTravel = benefit.properties?.find((property) => property.name === "差旅住宿專案");
  const employeeStay = benefit.properties?.find((property) => property.name === "員工福利住宿");
  if (!businessTravel || !Array.isArray(businessTravel.roomRates) || businessTravel.roomRates.length !== 4) {
    issue("福容大飯店高雄差旅住宿 roomRates 必須為 4 筆");
  }
  if (!employeeStay || !Array.isArray(employeeStay.roomRates) || employeeStay.roomRates.length !== 6) {
    issue("福容大飯店高雄員工福利住宿 roomRates 必須為 6 筆");
  }
  for (const property of [businessTravel, employeeStay].filter(Boolean)) {
    if (!Array.isArray(property.roomRateColumns)) {
      issue(`福容大飯店高雄「${property.name}」缺少 roomRateColumns`);
      continue;
    }
    property.roomRates?.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== property.roomRateColumns.length) {
        issue(`福容大飯店高雄「${property.name}」roomRates.${rowIndex} 欄位數不一致`);
      }
    });
  }

  if (benefit.contact?.phone !== "07-551-1188 轉 7706 或 7708") issue("福容大飯店高雄訂房電話不符");
  if (benefit.contact?.email !== "rsvn_KH@fullon-hotels.com.tw") issue("福容大飯店高雄訂房 Email 不符");

  const forbiddenSensitiveValues = [
    "53001555", "14103317", "maxchensales", "ing@acgf", "Max Chen",
    "陳彥文", "黃益勝", "沈嘉敏", "賴坤成", "07-531-7686",
  ];
  for (const forbidden of forbiddenSensitiveValues) {
    if (serialized.toLocaleLowerCase("zh-TW").includes(forbidden.toLocaleLowerCase("zh-TW"))) {
      issue(`福容大飯店高雄包含禁止公開資料：${forbidden}`);
    }
  }

  if (/國定(?:假日)?(?:及|、|／)?連續假日.*加價1,?000元(?:即可|可).*使用/.test(normalized)) {
    issue("福容大飯店高雄不得保證國定或連續假日加價 1,000 元即可使用");
  }
  const holidayNotice = "國定假日及連續假日的適用方式在契約不同位置記載不一，請訂房時以飯店確認結果為準";
  if (!Array.isArray(benefit.restrictions) || !benefit.restrictions.includes(holidayNotice)) {
    issue("福容大飯店高雄 restrictions 缺少國定及連續假日再次確認文字");
  }

  const publishedRoomRateCells = (benefit.properties || [])
    .flatMap((property) => property.roomRates || [])
    .flat()
    .map(String);
  if (publishedRoomRateCells.some((cell) => cell.includes("家庭套房"))) {
    issue("福容大飯店高雄不得公開家庭套房房價");
  }
  if (/軟墊.{0,20}1,?200|1,?200.{0,20}軟墊/.test(serialized)) {
    issue("福容大飯店高雄不得公開 1,200 元軟墊費");
  }
}
const fullonValidationPassed = errors.length === fullonErrorStart;

const liuduiErrorStart = errors.length;
const liudui = benefits.filter((benefit) => benefit.id === "liudui-hakka-kitchen" || benefit.slug === "liudui-hakka-kitchen" || benefit.name === "六堆伙房");
if (liudui.length !== 1) issue(`六堆伙房筆數應為 1，目前為 ${liudui.length}`);
if (liudui.length === 1) {
  const benefit = liudui[0];
  if (!/95\s*折/.test(benefit.featuredText || "")) issue("六堆伙房缺少 95 折優惠文字");
  if (benefit.publicationStatus !== "published" || benefit.verificationStatus !== "confirmed") issue("六堆伙房尚未設為 published + confirmed");
  if (JSON.stringify(benefit.locations) !== JSON.stringify(["壽德大樓門市"])) issue("六堆伙房適用門市與使用者確認內容不符");
  if (JSON.stringify(benefit.eligibility) !== JSON.stringify(["基金同仁本人"])) issue("六堆伙房適用對象與使用者確認內容不符");
  if (JSON.stringify(benefit.howToUse) !== JSON.stringify(["消費時出示員工證"])) issue("六堆伙房使用方式與使用者確認內容不符");
  for (const forbidden of ["validity", "contact", "restrictions", "offers"]) {
    if (benefit[forbidden] !== undefined) issue(`六堆伙房不得自行補寫欄位：${forbidden}`);
  }
}
const liuduiValidationPassed = errors.length === liuduiErrorStart;

if (publicBenefits.some((benefit) => benefit.publicationStatus !== "published" || benefit.verificationStatus !== "confirmed")) {
  issue("公開 filter 包含非 published + confirmed 資料");
}

console.log(`JSON 檔案：${path.relative(process.cwd(), file) || path.basename(file)}`);
console.log(`JSON 總筆數：${benefits.length}`);
console.log(`published 筆數：${publishedCount}`);
console.log(`confirmed 筆數：${confirmedCount}`);
console.log(`published + confirmed 筆數：${publicBenefits.length}`);
console.log(`前台顯示筆數：${displayBenefits.length}`);
console.log(`被排除筆數：${hiddenBenefits.length}`);
console.log(`類別統計：${[...categories].map(([name, count]) => `${name} ${count}`).join("、") || "無"}`);
console.log(`最早有效期限：${displayExpiries[0] || "尚未提供"}`);
console.log(`最晚有效期限：${displayExpiries.at(-1) || "尚未提供"}`);
console.log(`無期限項目：${noExpiry.map((benefit) => benefit.name).join("、") || "無"}`);
console.log(`期限可能已過：${expiredDisplay.map((benefit) => benefit.name).join("、") || "無"}`);
console.log(`重複 id：${duplicateIds.length}`);
console.log(`重複 slug：${duplicateSlugs.length}`);
console.log(`缺少發布欄位：${missingPublicationFields.join("、") || "無"}`);
console.log(`被排除項目：${hiddenBenefits.map((benefit) => `${benefit.name}（${benefit.publicationStatus || "缺少 publicationStatus"}/${benefit.verificationStatus || "缺少 verificationStatus"}）`).join("、") || "無"}`);
console.log(`福容大飯店高雄驗證：${fullonValidationPassed ? "通過" : "失敗"}`);
console.log(`六堆伙房驗證：${liuduiValidationPassed ? "通過" : "失敗"}`);
console.log("敏感字詞已核准例外：");
[...new Set(warnings)].forEach((warning) => console.log(`- ${warning}`));

if (errors.length) {
  console.error("\n驗證失敗：");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("驗證結果：通過");
