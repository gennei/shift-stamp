import { SHIFT_OPTIONS, SHIFT_TYPES, formatDayLabel, getPeriodDays } from "./shift.js";

export function renderDays(container, ym, plan, onChange) {
  container.innerHTML = "";
  const days = getPeriodDays(ym);

  days.forEach((dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    const row = document.createElement("div");
    row.className = "day-row";
    row.dataset.weekday = weekday;

    const label = document.createElement("div");
    label.className = "day-label";
    label.innerHTML = `<span class="day-date">${formatDayLabel(dateString)}</span>`;

    const options = document.createElement("div");
    options.className = "shift-options";

    const current = plan[dateString] || SHIFT_TYPES.OFF;

    SHIFT_OPTIONS.forEach((option) => {
      const optionLabel = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `shift-${dateString}`;
      input.value = option.type;
      input.checked = current === option.type;

      input.addEventListener("change", () => {
        onChange(dateString, option.type);
      });

      const span = document.createElement("span");
      span.textContent = option.label;

      optionLabel.appendChild(input);
      optionLabel.appendChild(span);
      options.appendChild(optionLabel);
    });

    row.appendChild(label);
    row.appendChild(options);
    container.appendChild(row);
  });
}

export function setStatus(target, message, tone = "info") {
  target.textContent = message;
  target.dataset.tone = tone;
}
