import DatePicker from "react-datepicker";
import { Form } from "react-bootstrap";
import "../../styles/datepicker-modal.css";

/**
 * @param {Date | null | undefined} date
 * @returns {string}
 */
export const toDateTimeLocalValue = (date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * @param {string} value
 * @returns {Date | null}
 */
export const parseDateTimeLocalValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Bootstrap-styled date + time picker (react-datepicker).
 * @param {{
 *   value: string,
 *   onChange: (value: string) => void,
 *   minDate?: Date | null,
 *   maxDate?: Date | null,
 *   required?: boolean,
 *   placeholder?: string,
 *   id?: string,
 * }} props
 */
const DateTimePickerField = ({
  value,
  onChange,
  minDate = null,
  maxDate = null,
  required = false,
  placeholder = "Select date and time",
  id,
}) => {
  const selected = parseDateTimeLocalValue(value);

  return (
    <div className="datetime-picker-field">
      <DatePicker
        id={id}
        selected={selected}
        onChange={(date) => onChange(toDateTimeLocalValue(date))}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="dd MMM yyyy, h:mm aa"
        minDate={minDate || undefined}
        maxDate={maxDate || undefined}
        placeholderText={placeholder}
        className="form-control"
        calendarClassName="shadow-sm border-0"
        popperClassName="react-datepicker-modal-popper"
        popperPlacement="bottom-start"
        required={required}
        autoComplete="off"
        showPopperArrow={false}
      />
      {selected && (
        <Form.Text className="text-muted">
          {selected.toLocaleString("en-IN", {
            weekday: "short",
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </Form.Text>
      )}
    </div>
  );
};

export default DateTimePickerField;
