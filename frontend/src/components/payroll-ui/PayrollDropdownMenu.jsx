import { Dropdown } from "react-bootstrap";

/** Keeps menus above `.table-responsive` clipping (overflow). */
export const PAYROLL_DROPDOWN_POPPER = { strategy: "fixed" };

/**
 * @param {import("react-bootstrap").DropdownMenuProps} props
 */
const PayrollDropdownMenu = ({ popperConfig, ...props }) => (
  <Dropdown.Menu
    renderOnMount
    popperConfig={{ ...PAYROLL_DROPDOWN_POPPER, ...popperConfig }}
    {...props}
  />
);

export default PayrollDropdownMenu;
