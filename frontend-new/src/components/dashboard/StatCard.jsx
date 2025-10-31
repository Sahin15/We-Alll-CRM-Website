import { Card } from "react-bootstrap";

const StatCard = ({ title, value, icon, bgColor = "primary", trend }) => {
  return (
    <Card className="shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-muted mb-1">{title}</p>
            <h3 className="mb-0">{value}</h3>
            {trend && (
              <small className={`text-${trend > 0 ? "success" : "danger"}`}>
                {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
              </small>
            )}
          </div>
          <div className={`bg-${bgColor} bg-opacity-10 p-3 rounded`}>
            <div className={`text-${bgColor} fs-3`}>{icon}</div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StatCard;
