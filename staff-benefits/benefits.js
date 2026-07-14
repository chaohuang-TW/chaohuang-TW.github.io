"use strict";

const DATA_URL = "/assets/data/staff-benefits/benefits.json";
const CATEGORY_ORDER = ["住宿", "餐飲", "交通", "醫療"];
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const labels = {
  validity: "有效期限",
  from: "開始日期",
  to: "結束日期",
  autoRenewal: "自動續約",
  renewalNote: "續約說明",
  address: "地址／地區",
  locations: "適用地區／門市",
  contact: "公開聯絡資訊",
  phone: "電話",
  fax: "傳真",
  email: "Email",
  website: "網站",
  roomRates: "房型與價格",
  otherRoomDiscounts: "其他房型優惠",
  howToUse: "使用方式",
  facilitiesAndCharges: "設施與其他費用",
  included: "包含項目",
  transportation: "交通與接駁",
  additionalCharges: "附加費用",
  stayRules: "住宿規則",
  diningAndFacilities: "餐飲與館內設施",
  freeFacilityRules: "免費設施規則",
  discounts: "優惠內容",
  definitions: "日期定義",
  weekday: "平日",
  holiday: "假日",
  specialFestivals: "特殊節慶",
  offers: "優惠內容",
  restrictions: "限制與不適用條件",
  eligibility: "適用資格",
  insurance: "保險",
  deductibles: "自負額與營業損失",
  mileage: "里程限制",
  vehicleRates: "車型與租車價格",
  serviceRules: "服務規則",
  lastVerified: "最後確認日期",
  name: "名稱",
  hours: "營業時間",
  prices: "價格",
  rules: "使用規則",
  activities: "活動",
  karaoke: "卡拉 OK",
  priceNote: "價格說明",
  item: "項目",
  discount: "優惠",
};

const sectionOrder = [
  "validity",
  "address",
  "locations",
  "contact",
  "roomRates",
  "otherRoomDiscounts",
  "howToUse",
  "facilitiesAndCharges",
  "included",
  "transportation",
  "additionalCharges",
  "stayRules",
  "diningAndFacilities",
  "freeFacilityRules",
  "discounts",
  "definitions",
  "offers",
  "eligibility",
  "insurance",
  "deductibles",
  "mileage",
  "vehicleRates",
  "serviceRules",
  "restrictions",
  "lastVerified",
];

const state = {
  benefits: [],
  activeCategory: "全部",
  query: "",
  sort: "default",
};

const elements = {
  availableCount: document.querySelector("#available-count"),
  categoryCount: document.querySelector("#category-count"),
  latestDate: document.querySelector("#latest-date"),
  search: document.querySelector("#benefit-search"),
  sort: document.querySelector("#benefit-sort"),
  categoryFilters: document.querySelector("#category-filters"),
  clear: document.querySelector("#clear-filters"),
  print: document.querySelector("#print-page"),
  resultCount: document.querySelector("#result-count"),
  list: document.querySelector("#benefit-list"),
  loading: document.querySelector("#loading-state"),
  empty: document.querySelector("#empty-state"),
  noPublic: document.querySelector("#no-public-state"),
  error: document.querySelector("#error-state"),
};

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function hasValue(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "尚未提供";
  const [year, month, day] = value.split("-");
  return `${year}/${month}/${day}`;
}

function formatCell(value) {
  if (typeof value === "number") return value.toLocaleString("zh-TW");
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function expiryText(benefit) {
  const end = benefit.validity?.to;
  return end ? `有效至 ${formatDate(end)}` : "期限請於使用前確認";
}

function isExpired(benefit) {
  const end = benefit.validity?.to;
  if (!end) return false;
  const date = new Date(`${end}T00:00:00`);
  return !Number.isNaN(date.valueOf()) && date < TODAY;
}

function locationText(benefit) {
  if (benefit.address) return benefit.address;
  if (Array.isArray(benefit.locations) && benefit.locations.length) return benefit.locations.join("、");
  return "";
}

function searchableText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value).map(searchableText).join(" ");
  return String(value);
}

function addFact(list, term, description) {
  if (!hasValue(description)) return;
  const wrapper = create("div", "fact");
  wrapper.append(create("dt", "", term), create("dd", "", description));
  list.append(wrapper);
}

function createList(items) {
  const list = create("ul", "detail-list");
  for (const item of items) list.append(create("li", "", formatCell(item)));
  return list;
}

function createDefinitionList(object, keyOrder = Object.keys(object)) {
  const list = create("dl", "definition-list");
  for (const key of keyOrder) {
    const value = object[key];
    if (!hasValue(value)) continue;
    list.append(create("dt", "", labels[key] || key));
    const description = create("dd");
    if (Array.isArray(value)) description.append(createList(value));
    else description.textContent = formatCell(value);
    list.append(description);
  }
  return list;
}

function createTable(columns, rows) {
  const wrapper = create("div", "data-table-wrap");
  const table = create("table", "data-table");
  const head = create("thead");
  const headRow = create("tr");
  columns.forEach((column) => headRow.append(create("th", "", column)));
  head.append(headRow);
  const body = create("tbody");
  for (const row of rows) {
    const tableRow = create("tr");
    row.forEach((cell, index) => {
      const tableCell = create("td", "", formatCell(cell));
      tableCell.setAttribute("data-label", columns[index]);
      tableRow.append(tableCell);
    });
    body.append(tableRow);
  }
  table.append(head, body);
  wrapper.append(table);
  return wrapper;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function createContact(contact) {
  const list = create("div", "contact-list");
  if (contact.phone) {
    const phone = create("a", "", contact.phone);
    const basePhone = contact.phone.split(/分機|ext\.?|#/i)[0];
    const safePhone = basePhone.replace(/[^0-9+]/g, "");
    phone.setAttribute("href", `tel:${safePhone}`);
    list.append(phone);
  }
  if (contact.fax) list.append(create("span", "", `傳真：${contact.fax}`));
  if (contact.email) {
    const email = create("a", "", contact.email);
    email.setAttribute("href", `mailto:${contact.email}`);
    list.append(email);
  }
  if (contact.website) {
    const url = safeExternalUrl(contact.website);
    if (url) {
      const website = create("a", "", contact.website);
      website.setAttribute("href", url);
      website.setAttribute("target", "_blank");
      website.setAttribute("rel", "noopener noreferrer");
      list.append(website);
    }
  }
  return list;
}

function appendNestedValue(container, key, value) {
  if (!hasValue(value)) return;
  const heading = create("h5", "", labels[key] || key);
  container.append(heading);
  if (Array.isArray(value)) container.append(createList(value));
  else container.append(create("p", "", formatCell(value)));
}

function createNestedCards(items) {
  const grid = create("div", "nested-grid");
  for (const item of items) {
    const card = create("section", "nested-card");
    if (item.name) card.append(create("h5", "", item.name));
    const scalarEntries = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === "name" || !hasValue(value)) continue;
      if (Array.isArray(value)) appendNestedValue(card, key, value);
      else scalarEntries[key] = value;
    }
    if (Object.keys(scalarEntries).length) card.append(createDefinitionList(scalarEntries));
    grid.append(card);
  }
  return grid;
}

function createDetailSection(title, content) {
  const section = create("section", "detail-section");
  section.append(create("h4", "", title), content);
  return section;
}

function renderField(benefit, key) {
  const value = benefit[key];
  if (!hasValue(value)) return null;

  if (key === "roomRates") {
    return createDetailSection(labels[key], createTable(benefit.rateColumns, value));
  }
  if (key === "vehicleRates") {
    return createDetailSection(labels[key], createTable(benefit.vehicleRateColumns, value));
  }
  if (key === "contact") return createDetailSection(labels[key], createContact(value));
  if (key === "validity") {
    const display = {
      from: value.from ? formatDate(value.from) : "尚未提供",
      to: value.to ? formatDate(value.to) : "期限請於使用前確認",
      autoRenewal: value.autoRenewal ? "是" : "否",
    };
    if (value.renewalNote) display.renewalNote = value.renewalNote;
    return createDetailSection(labels[key], createDefinitionList(display, ["from", "to", "autoRenewal", "renewalNote"]));
  }
  if (key === "definitions") return createDetailSection(labels[key], createDefinitionList(value));
  if (Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return createDetailSection(labels[key] || key, createNestedCards(value));
  }
  if (Array.isArray(value)) return createDetailSection(labels[key] || key, createList(value));
  if (key === "lastVerified") return createDetailSection(labels[key], create("p", "", formatDate(value)));
  return createDetailSection(labels[key] || key, create("p", "", formatCell(value)));
}

function createBenefitCard(benefit) {
  const article = create("article", "benefit-card");
  const body = create("div", "benefit-card__body");
  body.append(create("p", "benefit-card__category", benefit.category));
  body.append(create("h3", "", benefit.name));
  body.append(create("p", "benefit-card__featured", benefit.featuredText));
  if (benefit.summary) body.append(create("p", "benefit-card__summary", benefit.summary));

  const facts = create("dl", "benefit-card__facts");
  addFact(facts, "有效期限", expiryText(benefit));
  addFact(facts, "適用地區／門市", locationText(benefit));
  addFact(facts, "使用方式", benefit.howToUse?.[0]);
  body.append(facts);
  if (isExpired(benefit)) body.append(create("span", "expiry-warning", "期限可能已過"));

  const details = create("details", "benefit-details");
  details.append(create("summary", "", "查看完整內容"));
  const content = create("div", "benefit-details__content");
  for (const key of sectionOrder) {
    const section = renderField(benefit, key);
    if (section) content.append(section);
  }
  details.append(content);
  article.append(body, details);
  return article;
}

function filteredBenefits() {
  const query = state.query.trim().toLocaleLowerCase("zh-TW");
  const filtered = state.benefits.filter((benefit) => {
    const categoryMatch = state.activeCategory === "全部" || benefit.category === state.activeCategory;
    const queryMatch = !query || searchableText(benefit).toLocaleLowerCase("zh-TW").includes(query);
    return categoryMatch && queryMatch;
  });

  if (state.sort === "expiry") {
    filtered.sort((a, b) => {
      const aEnd = a.validity?.to || "9999-12-31";
      const bEnd = b.validity?.to || "9999-12-31";
      return aEnd.localeCompare(bEnd) || a.sourceIndex - b.sourceIndex;
    });
  } else if (state.sort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
  } else {
    filtered.sort((a, b) => a.sourceIndex - b.sourceIndex);
  }
  return filtered;
}

function render() {
  const results = filteredBenefits();
  elements.list.replaceChildren(...results.map(createBenefitCard));
  elements.resultCount.textContent = `顯示 ${results.length} 筆優惠`;
  elements.empty.hidden = results.length > 0 || state.benefits.length === 0;
  elements.clear.hidden = !state.query && state.activeCategory === "全部";
}

function setCategory(category) {
  state.activeCategory = category;
  for (const button of elements.categoryFilters.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.textContent === category));
  }
  render();
}

function renderCategoryFilters() {
  const found = [...new Set(state.benefits.map((benefit) => benefit.category))];
  found.sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, "zh-TW");
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const categories = ["全部", ...found];
  const buttons = categories.map((category) => {
    const button = create("button", "category-filter", category);
    button.type = "button";
    button.setAttribute("aria-pressed", String(category === state.activeCategory));
    button.addEventListener("click", () => setCategory(category));
    return button;
  });
  elements.categoryFilters.replaceChildren(...buttons);
}

function updateSummary(meta) {
  const categories = new Set(state.benefits.map((benefit) => benefit.category));
  const verifiedDates = state.benefits.map((benefit) => benefit.lastVerified).filter(Boolean).sort();
  const latest = verifiedDates.at(-1) || meta.updatedAt || meta.generatedAt || meta.lastUpdated;
  elements.availableCount.textContent = String(state.benefits.length);
  elements.categoryCount.textContent = String(categories.size);
  elements.latestDate.textContent = latest ? formatDate(latest) : "尚未提供";
}

async function loadBenefits() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("load failed");
    const data = await response.json();
    const allBenefits = Array.isArray(data.benefits) ? data.benefits : [];
    state.benefits = allBenefits
      .map((benefit, sourceIndex) => ({ ...benefit, sourceIndex }))
      .filter(
        (benefit) => benefit.publicationStatus === "published" && benefit.verificationStatus === "confirmed",
      );
    elements.loading.hidden = true;
    updateSummary(data.meta || {});
    if (!state.benefits.length) {
      elements.noPublic.hidden = false;
      elements.resultCount.textContent = "顯示 0 筆優惠";
      return;
    }
    renderCategoryFilters();
    render();
  } catch {
    elements.loading.hidden = true;
    elements.error.hidden = false;
    elements.resultCount.textContent = "";
  }
}

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

elements.sort.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

elements.clear.addEventListener("click", () => {
  state.query = "";
  state.activeCategory = "全部";
  elements.search.value = "";
  setCategory("全部");
  elements.search.focus();
});

elements.print.addEventListener("click", () => window.print());

let printOpenStates = [];
window.addEventListener("beforeprint", () => {
  const details = [...document.querySelectorAll(".benefit-details")];
  printOpenStates = details.map((item) => item.open);
  details.forEach((item) => {
    item.open = true;
  });
});

window.addEventListener("afterprint", () => {
  document.querySelectorAll(".benefit-details").forEach((item, index) => {
    item.open = printOpenStates[index] ?? false;
  });
});

loadBenefits();
