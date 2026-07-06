const DATA_PATHS = {
  meta: "../../assets/data/guarantee-fee/fee-table-meta.json",
  tableA: "../../assets/data/guarantee-fee/fee-table-a.json",
  tableB: "../../assets/data/guarantee-fee/fee-table-b.json",
  tableC: "../../assets/data/guarantee-fee/fee-table-c.json",
  validationCases: "../../assets/data/guarantee-fee/validation-cases.json"
};

const REPAYMENT_LABELS = {
  maturity: "到期一次償還",
  principal_equal: "本金平均攤還",
  principal_equal_with_grace: "本金寬緩後平均攤還",
  annuity_monthly: "本息按月平均攤還（年金法）"
};

const FREQUENCY_LABELS = {
  monthly: "每月",
  quarterly: "每三個月",
  semiannual: "每六個月",
  annual: "每年"
};

const GRACE_LABELS = {
  grace_1: "1",
  grace_2: "2",
  grace_3: "3"
};

const state = {
  feeTables: null
};

const elements = {
  form: document.querySelector("#fee-calculator-form"),
  message: document.querySelector("#fee-form-message"),
  resultCard: document.querySelector("#fee-result-card"),
  loanAmount: document.querySelector("#loan-amount"),
  guaranteeRatio: document.querySelector("#guarantee-ratio"),
  customGuaranteeRatio: document.querySelector("#custom-guarantee-ratio"),
  customRatioField: document.querySelector("#custom-ratio-field"),
  feeRate: document.querySelector("#fee-rate"),
  repaymentType: document.querySelector("#repayment-type"),
  loanYears: document.querySelector("#loan-years"),
  repaymentFrequency: document.querySelector("#repayment-frequency"),
  repaymentFrequencyField: document.querySelector("#repayment-frequency-field"),
  graceKey: document.querySelector("#grace-key"),
  graceKeyField: document.querySelector("#grace-key-field"),
  loanInterestRate: document.querySelector("#loan-interest-rate"),
  loanInterestRateField: document.querySelector("#loan-interest-rate-field")
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function loadFeeTables() {
  const [meta, tableA, tableB, tableC, validationCases] = await Promise.all([
    loadJson(DATA_PATHS.meta),
    loadJson(DATA_PATHS.tableA),
    loadJson(DATA_PATHS.tableB),
    loadJson(DATA_PATHS.tableC),
    loadJson(DATA_PATHS.validationCases)
  ]);

  return { meta, tableA, tableB, tableC, validationCases };
}

function parseMoneyInput(value) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return NaN;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN;
  return Number(normalized);
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-Hant-TW", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatRate(rate) {
  return `${rate}%`;
}

function getGuaranteeRatio() {
  if (elements.guaranteeRatio.value !== "custom") {
    return Number(elements.guaranteeRatio.value);
  }

  const customRatio = Number(elements.customGuaranteeRatio.value.trim());
  if (!Number.isFinite(customRatio) || customRatio <= 0 || customRatio > 100) {
    throw new Error("保證成數須大於 0 且小於等於 100。");
  }
  return customRatio;
}

function getGuaranteeAmount(loanAmount, guaranteeRatio) {
  return loanAmount * (guaranteeRatio / 100);
}

function getFeeMultiplier(feeRate) {
  return state.feeTables.meta.feeRateMultipliers[feeRate];
}

function getAvailableLoanYears(repaymentType, graceKey) {
  if (repaymentType === "principal_equal_with_grace") {
    return Object.keys(state.feeTables.tableB.principal_equal_with_grace[graceKey].monthly);
  }

  if (repaymentType === "annuity_monthly") {
    const firstRate = Object.keys(state.feeTables.tableC.annuity_monthly)[0];
    return Object.keys(state.feeTables.tableC.annuity_monthly[firstRate]);
  }

  return Object.keys(state.feeTables.tableA.maturity);
}

function getTableSourceText(params) {
  if (params.repaymentType === "maturity") {
    return `表甲｜貸款到期償還｜${params.loanYears} 年`;
  }

  if (params.repaymentType === "principal_equal") {
    return `表甲｜本金平均攤還｜${FREQUENCY_LABELS[params.repaymentFrequency]}｜${params.loanYears} 年`;
  }

  if (params.repaymentType === "principal_equal_with_grace") {
    return `表乙｜本金寬緩 ${GRACE_LABELS[params.graceKey]} 年｜${FREQUENCY_LABELS[params.repaymentFrequency]}｜${params.loanYears} 年`;
  }

  return `表丙｜本息按月平均攤還｜貸款年利率 ${params.loanInterestRate}%｜${params.loanYears} 年`;
}

function lookupBaseFee(params) {
  if (params.repaymentType === "maturity") {
    return {
      tableId: "A",
      baseFeePer10k: state.feeTables.tableA.maturity[params.loanYears],
      lookupText: getTableSourceText(params)
    };
  }

  if (params.repaymentType === "principal_equal") {
    return {
      tableId: "A",
      baseFeePer10k: state.feeTables.tableA.principal_equal[params.repaymentFrequency]?.[params.loanYears],
      lookupText: getTableSourceText(params)
    };
  }

  if (params.repaymentType === "principal_equal_with_grace") {
    return {
      tableId: "B",
      baseFeePer10k: state.feeTables.tableB.principal_equal_with_grace[params.graceKey]?.[params.repaymentFrequency]?.[params.loanYears],
      lookupText: getTableSourceText(params)
    };
  }

  return {
    tableId: "C",
    baseFeePer10k: state.feeTables.tableC.annuity_monthly[params.loanInterestRate]?.[params.loanYears],
    lookupText: getTableSourceText(params)
  };
}

function calculateFee(params) {
  const lookup = lookupBaseFee(params);
  if (typeof lookup.baseFeePer10k !== "number") {
    sendAnalytics("guarantee_fee_lookup_failed", {
      reason: "missing_table_value",
      repayment_type: params.repaymentType
    });
    throw new Error("目前查無對應表列資料，請確認貸款期限、寬緩年數、攤還頻率或貸款利率是否符合查索表範圍。");
  }

  const guaranteeAmount = getGuaranteeAmount(params.loanAmount, params.guaranteeRatio);
  const units = guaranteeAmount / 10000;
  const multiplier = getFeeMultiplier(params.feeRate);
  const rawFee = lookup.baseFeePer10k * units * multiplier;
  const finalFee = Math.round(rawFee);

  return {
    ...params,
    ...lookup,
    guaranteeAmount,
    units,
    multiplier,
    rawFee,
    finalFee,
    formulaText: `${lookup.baseFeePer10k.toFixed(2)} × ${formatMoney(units)} × ${formatMoney(multiplier)} = ${formatMoney(rawFee)}`
  };
}

function renderResult(result) {
  elements.resultCard.innerHTML = `
    <p class="section-kicker">Result</p>
    <h2>應收保證手續費</h2>
    <p class="fee-result-amount">${formatMoney(result.finalFee)} 元</p>
    <dl class="fee-result-details">
      <div><dt>查表依據</dt><dd>${result.lookupText}</dd></div>
      <div><dt>貸款金額</dt><dd>${formatMoney(result.loanAmount)} 元</dd></div>
      <div><dt>保證成數</dt><dd>${formatMoney(result.guaranteeRatio)}%</dd></div>
      <div><dt>保證金額</dt><dd>${formatMoney(result.guaranteeAmount)} 元</dd></div>
      <div><dt>適用保證手續費率</dt><dd>${formatRate(result.feeRate)}</dd></div>
      <div><dt>費率倍數</dt><dd>${formatMoney(result.multiplier)}</dd></div>
      <div><dt>表列每萬元手續費</dt><dd>${result.baseFeePer10k.toFixed(2)} 元</dd></div>
      <div><dt>計算式</dt><dd>${result.formulaText}</dd></div>
      <div><dt>四捨五入後金額</dt><dd>${formatMoney(result.finalFee)} 元</dd></div>
    </dl>
    <p class="fee-result-note">本試算依農業信用保證手續費一次總繳簡捷查索表估算，實際應收金額仍以承辦機構及基金規定核算結果為準。</p>
  `;
}

function renderError(message) {
  elements.message.textContent = message;
  elements.message.hidden = false;
}

function clearError() {
  elements.message.textContent = "";
  elements.message.hidden = true;
}

function sendAnalytics(eventName, params) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

function renderOptions(select, values, getLabel = (value) => value) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = getLabel(value);
    select.append(option);
  });
}

function updateConditionalFields() {
  const repaymentType = elements.repaymentType.value;
  const isPrincipalEqual = repaymentType === "principal_equal";
  const isGrace = repaymentType === "principal_equal_with_grace";
  const isAnnuity = repaymentType === "annuity_monthly";

  elements.repaymentFrequencyField.hidden = !(isPrincipalEqual || isGrace);
  elements.graceKeyField.hidden = !isGrace;
  elements.loanInterestRateField.hidden = !isAnnuity;
  elements.customRatioField.hidden = elements.guaranteeRatio.value !== "custom";
}

function updateLoanYears() {
  const years = getAvailableLoanYears(elements.repaymentType.value, elements.graceKey.value);
  const currentValue = elements.loanYears.value;
  renderOptions(elements.loanYears, years, (year) => `${year} 年`);
  elements.loanYears.value = years.includes(currentValue) ? currentValue : years[0];
}

function updateFeeRates() {
  const rates = Object.keys(state.feeTables.meta.feeRateMultipliers);
  renderOptions(elements.feeRate, rates, (rate) => `${rate}%`);
  elements.feeRate.value = rates.includes("0.5") ? "0.5" : rates[0];
}

function updateLoanInterestRates() {
  const rates = Object.keys(state.feeTables.tableC.annuity_monthly);
  renderOptions(elements.loanInterestRate, rates, (rate) => `${rate}%`);
  elements.loanInterestRate.value = rates.includes("5.00") ? "5.00" : rates[0];
}

function getFormParams() {
  if (!elements.loanAmount.value.trim()) {
    throw new Error("請輸入貸款金額。");
  }

  const loanAmount = parseMoneyInput(elements.loanAmount.value);
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    throw new Error("貸款金額格式不正確，請輸入大於 0 的金額。");
  }

  const repaymentType = elements.repaymentType.value;
  return {
    loanAmount,
    guaranteeRatio: getGuaranteeRatio(),
    feeRate: elements.feeRate.value,
    repaymentType,
    repaymentFrequency: elements.repaymentFrequency.value,
    graceKey: elements.graceKey.value,
    graceYears: Number(GRACE_LABELS[elements.graceKey.value] || 0),
    loanInterestRate: elements.loanInterestRate.value,
    loanYears: elements.loanYears.value
  };
}

function handleSubmit(event) {
  event.preventDefault();
  clearError();

  try {
    const params = getFormParams();
    const result = calculateFee(params);
    renderResult(result);
    sendAnalytics("calculate_guarantee_fee", {
      repayment_type: result.repaymentType,
      fee_rate: result.feeRate,
      loan_years: result.loanYears,
      grace_years: result.repaymentType === "principal_equal_with_grace" ? result.graceYears : "",
      repayment_frequency: result.repaymentType === "principal_equal" || result.repaymentType === "principal_equal_with_grace" ? result.repaymentFrequency : "",
      loan_interest_rate: result.repaymentType === "annuity_monthly" ? result.loanInterestRate : "",
      table_id: result.tableId
    });
  } catch (error) {
    renderError(error.message);
  }
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.guaranteeRatio.addEventListener("change", () => {
    updateConditionalFields();
    clearError();
  });
  elements.repaymentType.addEventListener("change", () => {
    updateConditionalFields();
    updateLoanYears();
    clearError();
  });
  elements.graceKey.addEventListener("change", () => {
    updateLoanYears();
    clearError();
  });
}

function initializeForm() {
  updateFeeRates();
  updateLoanInterestRates();
  updateConditionalFields();
  updateLoanYears();
  bindEvents();
}

async function bootstrap() {
  try {
    state.feeTables = await loadFeeTables();
    initializeForm();
    sendAnalytics("view_fee_calculator", {
      tool_name: "農信保保證手續費試算器"
    });
  } catch (_error) {
    renderError("資料載入失敗，請稍後再試。");
  }
}

bootstrap();
