import { createContext, useContext, useState, useEffect } from "react";

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(() => {
    // Load from localStorage or default to "We Alll"
    const saved = localStorage.getItem("selectedCompany");
    return saved || "We Alll";
  });

  useEffect(() => {
    // Persist to localStorage whenever it changes
    localStorage.setItem("selectedCompany", selectedCompany);
  }, [selectedCompany]);

  const switchCompany = (company) => {
    if (company === "We Alll" || company === "Kolkata Digital") {
      setSelectedCompany(company);
    } else {
      console.error("Invalid company name");
    }
  };

  const value = {
    selectedCompany,
    switchCompany,
    isWeAlll: selectedCompany === "We Alll",
    isKolkataDigital: selectedCompany === "Kolkata Digital",
  };

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
};

export default CompanyContext;
