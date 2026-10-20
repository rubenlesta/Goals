const ACCESS_PIN = "0000";
const lockscreen = document.querySelector("#lockscreen");
const appRoot = document.querySelector("#appRoot");
const indicators = document.querySelector("#pinIndicators");
const errorMessage = document.querySelector("#lockError");
const keys = [...document.querySelectorAll(".pin-key[data-digit]")];
const digits = [];
let checkingPin = false;
let resetTimer;

function renderDigits() {
  indicators.querySelectorAll(".pin-indicator").forEach((indicator, index) => {
    indicator.classList.toggle("is-filled", index < digits.length);
  });
  indicators.setAttribute("aria-label", `PIN: ${digits.length} de 4 dígitos`);
}

function clearDigits() {
  digits.length = 0;
  renderDigits();
}

function unlock() {
  lockscreen.inert = true;
  lockscreen.setAttribute("aria-hidden", "true");
  appRoot.inert = false;
  appRoot.setAttribute("aria-hidden", "false");
  document.documentElement.classList.remove("is-locked");
  document.dispatchEvent(new Event("rumbo:unlocked"));
  document.querySelector("#pageTitle").focus();
}

function submitPin() {
  checkingPin = true;
  if (digits.join("") === ACCESS_PIN) {
    errorMessage.textContent = "";
    lockscreen.classList.add("is-unlocking");
    window.setTimeout(unlock, 220);
    return;
  }
  errorMessage.textContent = "Ese PIN no coincide. Inténtalo de nuevo.";
  lockscreen.classList.remove("has-error");
  void lockscreen.offsetWidth;
  lockscreen.classList.add("has-error");
  if ("vibrate" in navigator) navigator.vibrate(120);
  window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(() => {
    clearDigits();
    errorMessage.textContent = "";
    lockscreen.classList.remove("has-error");
    checkingPin = false;
  }, 750);
}

function addDigit(digit) {
  if (checkingPin || digits.length >= 4) return;
  errorMessage.textContent = "";
  digits.push(digit);
  renderDigits();
  if (digits.length === 4) submitPin();
}

function deleteDigit() {
  if (checkingPin || digits.length === 0) return;
  digits.pop();
  renderDigits();
  errorMessage.textContent = "";
}

keys.forEach((key) => key.addEventListener("click", () => addDigit(key.dataset.digit)));
document.querySelector("#pinBackspace").addEventListener("click", deleteDigit);
document.addEventListener("keydown", (event) => {
  if (!document.documentElement.classList.contains("is-locked")) return;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    addDigit(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    deleteDigit();
  }
});

renderDigits();
