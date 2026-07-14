"use strict";

const DATA_URL = "/assets/data/staff-benefits/benefits.json";
const CATEGORY_ORDER = ["住宿", "餐飲", "交通", "醫療"];
const OMITTED_KEYS = new Set([
  "id", "slug", "publicationStatus", "verificationStatus", "verificationNotes", "source", "sourceIndex",
  "featuredText", "summary", "category", "name", "lastVerified", "validity", "contact",
  "roomRateColumns", "rateColumns", "vehicleRateColumns", "roomRates", "vehicleRates",
]);

const LABELS = {
  from: "開始日期", to: "結束日期", autoRenewal: "自動續約", renewalNote: "續約說明",
  note: "說明", address: "地址／地區", locations: "適用地區／門市", phone: "電話",
  fax: "傳真", email: "Email", website: "網站", howToUse: "怎麼使用", eligibility: "適用對象",
  offers: "優惠內容", discounts: "優惠內容", otherRoomDiscounts: "其他房型優惠",
  annualRewards: "年度回饋", restrictions: "限制與不適用條件", commonRestrictions: "共同限制",
  stayRules: "住宿規則", definitions: "日期定義", included: "包含項目",
  facilitiesAndCharges: "設施與其他費用", transportation: "交通與接駁", additionalCharges: "附加費用",
  freeFacilityRules: "免費設施規則", serviceRules: "服務規則", hoteldayCommonPolicies: "共同規則",
  insurance: "保險", deductibles: "自負額與營業損失", mileage: "里程限制",
  diningAndFacilities: "餐飲與館內設施", properties: "館別優惠", facilities: "設施",
  diningAndServices: "餐飲與服務", depositAndCancellation: "定金與取消規定",
  specialDates: "特殊日期", consecutiveHolidays: "連續假期", springFestival: "春節",
  dining: "餐飲優惠", restaurants: "適用餐廳", rooms: "客房數", pricing: "價格",
  breakfast: "早餐", parking: "停車", item: "項目", discount: "優惠", weekday: "平日",
  holiday: "假日", specialFestivals: "特殊節慶", name: "名稱", hours: "營業時間",
  prices: "價格", rules: "使用規則", activities: "活動", karaoke: "卡拉 OK", priceNote: "價格說明",
};

const state = {
  benefits: [],
  activeCategory: "全部",
  query: "",
  detailFromList: false,
  returnScrollY: 0,
};

const elements = {
  listView: document.querySelector("#list-view"),
  detailView: document.querySelector("#detail-view"),
  detailContent: document.querySelector("#detail-content"),
  categories: document.querySelector("#category-buttons"),
  search: document.querySelector("#benefit-search"),
  list: document.querySelector("#benefit-list"),
  resultCount: document.querySelector("#result-count"),
  loading: document.querySelector("#loading-state"),
  empty: document.querySelector("#empty-state"),
  error: document.querySelector("#error-state"),
  showAllTop: document.querySelector("#show-all-top"),
  showAllEmpty: document.querySelector("#show-all-empty"),
  back: document.querySelector("#back-to-list"),
  print: document.querySelector("#print-detail"),
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
  if (typeof value === "object") return Object.keys(value).some((key) => hasValue(value[key]));
  return true;
}

function label(key) {
  return LABELS[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value.replaceAll("-", "/");
}

function formatValue(value, key = "") {
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return value.toLocaleString("zh-TW");
  if (["from", "to", "lastVerified"].includes(key)) return formatDate(value) || String(value);
  return String(value);
}

function slugFor(benefit) {
  return benefit.slug || benefit.id;
}

function expiryValue(benefit) {
  const validity = benefit.validity || {};
  return [validity.to, validity.chengYiHotel?.to, validity.hotelday?.to].filter(Boolean).sort()[0] || "";
}

function expiryText(benefit) {
  const expiry = expiryValue(benefit);
  return expiry ? `有效至 ${formatDate(expiry)}` : "";
}

function searchableText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value).map(searchableText).join(" ");
  return String(value);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function createDefinitionList(entries) {
  const dl = create("dl", "definition-list");
  for (const [key, value] of entries) {
    if (!hasValue(value)) continue;
    const row = create("div");
    row.append(create("dt", "", label(key)), create("dd", "", formatValue(value, key)));
    dl.append(row);
  }
  return dl;
}

function createPrimitiveList(values) {
  const list = create("ul");
  for (const value of values) list.append(create("li", "", formatValue(value)));
  return list;
}

function createObjectCard(object, headingFallback = "") {
  const card = create("section", "info-card");
  const heading = object.name || object.item || headingFallback;
  if (heading) card.append(create("h4", "", heading));
  const scalarEntries = Object.entries(object).filter(([key, value]) => !["name", "item"].includes(key) && !Array.isArray(value) && typeof value !== "object" && hasValue(value));
  if (scalarEntries.length) card.append(createDefinitionList(scalarEntries));
  for (const [key, value] of Object.entries(object)) {
    if (["name", "item"].includes(key) || !hasValue(value) || (!Array.isArray(value) && typeof value !== "object")) continue;
    card.append(create("h4", "", label(key)), renderValue(value, key));
  }
  return card;
}

function renderValue(value, key = "") {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object" || item === null)) return createPrimitiveList(value);
    const grid = create("div", "info-grid");
    value.forEach((item, index) => grid.append(Array.isArray(item)
      ? createObjectCard(Object.fromEntries(item.map((cell, cellIndex) => [`${cellIndex + 1}`, cell])), `${label(key)} ${index + 1}`)
      : createObjectCard(item, `${label(key)} ${index + 1}`)));
    return grid;
  }
  if (typeof value === "object" && value !== null) {
    const wrapper = create("div");
    const scalars = Object.entries(value).filter(([, child]) => typeof child !== "object" && hasValue(child));
    if (scalars.length) wrapper.append(createDefinitionList(scalars));
    for (const [childKey, child] of Object.entries(value)) {
      if (!hasValue(child) || typeof child !== "object") continue;
      wrapper.append(create("h4", "", label(childKey)), renderValue(child, childKey));
    }
    return wrapper;
  }
  return create("p", "", formatValue(value, key));
}

function createRateCards(columns, rows) {
  const grid = create("div", "rate-grid");
  for (const row of rows) {
    const card = create("article", "rate-card");
    card.append(create("h4", "", formatValue(row[0])));
    card.append(createDefinitionList(row.slice(1).map((value, index) => [columns[index + 1] || `項目 ${index + 2}`, value])));
    grid.append(card);
  }
  return grid;
}

function createPropertyCards(properties) {
  const grid = create("div", "info-grid");
  for (const property of properties) {
    const card = create("section", "info-card");
    card.append(create("h4", "", property.name));
    const scalarEntries = Object.entries(property).filter(([key, value]) => !["name", "phone"].includes(key) && !key.endsWith("Columns") && key !== "roomRates" && !Array.isArray(value) && typeof value !== "object" && hasValue(value));
    if (scalarEntries.length) card.append(createDefinitionList(scalarEntries));
    if (property.phone) card.append(createContactLinks({ phone: property.phone }));
    const columns = property.roomRateColumns || property.rateColumns;
    if (columns && property.roomRates) card.append(create("h4", "", "房型與價格"), createRateCards(columns, property.roomRates));
    for (const [key, value] of Object.entries(property)) {
      if (["name", "phone", "roomRateColumns", "rateColumns", "roomRates"].includes(key) || !hasValue(value) || (!Array.isArray(value) && typeof value !== "object")) continue;
      card.append(create("h4", "", label(key)), renderValue(value, key));
    }
    grid.append(card);
  }
  return grid;
}

function createContactLinks(contact) {
  const wrapper = create("div", "contact-actions");
  if (contact.phone) {
    const href = `tel:${String(contact.phone).replace(/[^\d+]/g, "")}`;
    const link = create("a", "contact-link", "撥打電話");
    link.setAttribute("href", href);
    wrapper.append(link);
  }
  if (contact.email) {
    const link = create("a", "contact-link", "寄送 Email");
    link.setAttribute("href", `mailto:${contact.email}`);
    wrapper.append(link);
  }
  const website = safeUrl(contact.website);
  if (website) {
    const link = create("a", "contact-link", "開啟官方網站");
    link.setAttribute("href", website);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    wrapper.append(link);
  }
  if (contact.fax) wrapper.append(create("p", "", `傳真：${contact.fax}`));
  return wrapper;
}

function detailSection(title, contents) {
  const section = create("section", "detail-section");
  section.append(create("h3", "", title));
  contents.filter(Boolean).forEach((content) => section.append(content));
  return section;
}

function valuesFor(benefit, keys) {
  return keys.filter((key) => hasValue(benefit[key])).map((key) => {
    const wrapper = create("div");
    if (keys.length > 1) wrapper.append(create("h4", "", label(key)));
    wrapper.append(renderValue(benefit[key], key));
    return wrapper;
  });
}

function createDetail(benefit) {
  const fragment = document.createDocumentFragment();
  const hero = create("header", "detail-hero");
  hero.append(create("p", "detail-hero__category", benefit.category));
  const heading = create("h2", "", benefit.name);
  heading.id = "detail-title";
  heading.tabIndex = -1;
  hero.append(heading, create("p", "detail-hero__offer", benefit.featuredText));
  const expiry = expiryText(benefit);
  if (expiry) hero.append(create("p", "detail-hero__expiry", expiry));
  hero.append(create("p", "detail-hero__notice", "優惠內容可能因廠商政策調整；使用前請再次確認適用門市、日期及限制。"));
  fragment.append(hero);

  const sections = create("div", "detail-sections");
  const offer = [benefit.summary ? create("p", "", benefit.summary) : null, ...valuesFor(benefit, ["offers", "discounts", "otherRoomDiscounts", "annualRewards"])];
  if (offer.some(Boolean)) sections.append(detailSection("優惠內容", offer));
  if (hasValue(benefit.howToUse)) sections.append(detailSection("怎麼使用", [renderValue(benefit.howToUse, "howToUse")]));
  if (hasValue(benefit.eligibility)) sections.append(detailSection("適用對象", [renderValue(benefit.eligibility, "eligibility")]));
  const locations = [];
  if (benefit.address) locations.push(create("p", "", benefit.address));
  if (hasValue(benefit.locations)) locations.push(renderValue(benefit.locations, "locations"));
  if (locations.length) sections.append(detailSection("適用地區／門市", locations));

  const prices = [];
  const roomColumns = benefit.roomRateColumns || benefit.rateColumns;
  if (roomColumns && benefit.roomRates) prices.push(createRateCards(roomColumns, benefit.roomRates));
  if (benefit.vehicleRateColumns && benefit.vehicleRates) prices.push(createRateCards(benefit.vehicleRateColumns, benefit.vehicleRates));
  if (benefit.properties) prices.push(createPropertyCards(benefit.properties));
  if (benefit.diningAndFacilities) prices.push(renderValue(benefit.diningAndFacilities, "diningAndFacilities"));
  if (prices.length) sections.append(detailSection("房型、車型或品項價格", prices));

  const restrictions = valuesFor(benefit, ["restrictions", "commonRestrictions", "stayRules", "definitions"]);
  if (restrictions.length) sections.append(detailSection("限制與不適用條件", restrictions));
  const services = valuesFor(benefit, ["included", "facilitiesAndCharges", "transportation", "additionalCharges", "freeFacilityRules", "serviceRules", "hoteldayCommonPolicies", "insurance", "deductibles", "mileage"]);
  if (services.length) sections.append(detailSection("附加服務", services));
  if (hasValue(benefit.contact)) sections.append(detailSection("聯絡方式", [createContactLinks(benefit.contact)]));
  if (hasValue(benefit.validity)) sections.append(detailSection("有效期限", [renderValue(benefit.validity, "validity")]));
  if (benefit.lastVerified) sections.append(detailSection("最後確認日期", [create("p", "", formatDate(benefit.lastVerified))]));

  const remaining = Object.entries(benefit).filter(([key, value]) => !OMITTED_KEYS.has(key) && ![
    "offers", "discounts", "otherRoomDiscounts", "annualRewards", "howToUse", "eligibility", "address", "locations",
    "properties", "diningAndFacilities", "restrictions", "commonRestrictions", "stayRules", "definitions", "included",
    "facilitiesAndCharges", "transportation", "additionalCharges", "freeFacilityRules", "serviceRules", "hoteldayCommonPolicies",
    "insurance", "deductibles", "mileage",
  ].includes(key) && hasValue(value));
  if (remaining.length) sections.append(detailSection("其他資訊", remaining.map(([key, value]) => {
    const wrapper = create("div");
    wrapper.append(create("h4", "", label(key)), renderValue(value, key));
    return wrapper;
  })));
  fragment.append(sections);
  return { fragment, heading };
}

function createCategoryButtons() {
  elements.categories.replaceChildren();
  const counts = new Map(CATEGORY_ORDER.map((category) => [category, state.benefits.filter((item) => item.category === category).length]));
  for (const category of CATEGORY_ORDER) {
    const count = counts.get(category);
    const button = create("button", "category-button");
    button.type = "button";
    button.dataset.category = category;
    button.setAttribute("aria-pressed", String(state.activeCategory === category));
    button.append(create("span", "category-button__name", category));
    button.append(create("span", "category-button__count", count ? `${count} 項優惠` : "目前沒有已確認優惠"));
    button.addEventListener("click", () => {
      state.activeCategory = state.activeCategory === category ? "全部" : category;
      renderList();
    });
    elements.categories.append(button);
  }
}

function filteredBenefits() {
  const query = state.query.trim().toLocaleLowerCase("zh-TW");
  return state.benefits.filter((benefit) => {
    const categoryMatches = state.activeCategory === "全部" || benefit.category === state.activeCategory;
    const queryMatches = !query || searchableText(benefit).toLocaleLowerCase("zh-TW").includes(query);
    return categoryMatches && queryMatches;
  });
}

function createBenefitCard(benefit) {
  const card = create("a", "benefit-card");
  card.setAttribute("href", `#${encodeURIComponent(slugFor(benefit))}`);
  card.append(create("p", "benefit-card__category", benefit.category));
  card.append(create("h3", "", benefit.name));
  card.append(create("p", "benefit-card__offer", benefit.featuredText));
  const expiry = expiryText(benefit);
  if (expiry) card.append(create("p", "benefit-card__expiry", expiry));
  card.append(create("span", "benefit-card__link", "查看完整優惠"));
  card.addEventListener("click", () => {
    state.detailFromList = true;
    state.returnScrollY = window.scrollY;
  });
  return card;
}

function renderList() {
  createCategoryButtons();
  const results = filteredBenefits();
  elements.list.replaceChildren(...results.map(createBenefitCard));
  elements.resultCount.textContent = `共 ${results.length} 項`;
  elements.empty.hidden = results.length !== 0;
  elements.showAllTop.hidden = state.activeCategory === "全部" && !state.query;
}

function showList() {
  elements.detailView.hidden = true;
  elements.listView.hidden = false;
  renderList();
  requestAnimationFrame(() => window.scrollTo({ top: state.returnScrollY, behavior: "auto" }));
}

function showDetail(benefit) {
  elements.listView.hidden = true;
  elements.detailView.hidden = false;
  elements.detailContent.replaceChildren();
  const { fragment, heading } = createDetail(benefit);
  elements.detailContent.append(fragment);
  window.scrollTo({ top: 0, behavior: "auto" });
  requestAnimationFrame(() => heading.focus());
}

function route() {
  const slug = decodeURIComponent(location.hash.slice(1));
  if (!slug) return showList();
  const benefit = state.benefits.find((item) => slugFor(item) === slug);
  if (benefit) return showDetail(benefit);
  state.detailFromList = false;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  showList();
}

function showAll() {
  state.activeCategory = "全部";
  state.query = "";
  elements.search.value = "";
  renderList();
  document.querySelector("#category-title").focus({ preventScroll: true });
}

function returnToList() {
  if (state.detailFromList && history.length > 1) history.back();
  else {
    state.detailFromList = false;
    history.pushState(null, "", `${location.pathname}${location.search}`);
    showList();
    document.querySelector("#category-title").focus({ preventScroll: true });
  }
}

async function loadBenefits() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("load failed");
    const data = await response.json();
    state.benefits = (Array.isArray(data.benefits) ? data.benefits : [])
      .map((benefit, sourceIndex) => ({ ...benefit, sourceIndex }))
      .filter((benefit) => benefit.publicationStatus === "published" && benefit.verificationStatus === "confirmed")
      .sort((a, b) => (a.sort ?? a.order ?? a.sourceIndex) - (b.sort ?? b.order ?? b.sourceIndex));
    elements.loading.hidden = true;
    route();
  } catch {
    elements.loading.hidden = true;
    elements.error.hidden = false;
  }
}

elements.search.addEventListener("input", () => {
  state.query = elements.search.value;
  renderList();
});
elements.showAllTop.addEventListener("click", showAll);
elements.showAllEmpty.addEventListener("click", showAll);
elements.back.addEventListener("click", returnToList);
elements.print.addEventListener("click", () => window.print());
window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.detailView.hidden) returnToList();
});

loadBenefits();
