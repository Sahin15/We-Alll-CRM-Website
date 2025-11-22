import { Spinner } from "react-bootstrap";

const LoadingSpinner = ({ size = "md", text = "Loading..." }) => {
  const sizeMap = {
    sm: { width: "1rem", height: "1rem" },
    md: { width: "2rem", height: "2rem" },
    lg: { width: "3rem", height: "3rem" },
  };

  return (
    <div className="text-center py-5">
      <Spinner
        animation="border"
        role="status"
        style={sizeMap[size]}
        className="text-primary"
      >
        <span className="visually-hidden">{text}</span>
      </Spinner>
      {text && <p className="mt-3 text-muted">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
