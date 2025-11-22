import { useCompany } from "../../context/CompanyContext";
import "./CompanySwitcher.css";

const CompanySwitcher = () => {
  const { selectedCompany, switchCompany } = useCompany();

  return (
    <div className="company-switcher">
      <button
        className={`company-btn ${selectedCompany === "We Alll" ? "active" : ""}`}
        onClick={() => switchCompany("We Alll")}
      >
        We Alll
      </button>
      <button
        className={`company-btn ${selectedCompany === "Kolkata Digital" ? "active" : ""}`}
        onClick={() => switchCompany("Kolkata Digital")}
      >
        Kolkata Digital
      </button>
    </div>
  );
};

export default CompanySwitcher;
