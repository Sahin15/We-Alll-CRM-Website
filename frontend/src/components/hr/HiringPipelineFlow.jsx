import { Badge } from "react-bootstrap";
import { PIPELINE_STEPS, stageLabel } from "../../utils/hiringPipeline";

/**
 * Visual summary of the HMS interview pipeline stages.
 * @param {{ compact?: boolean, currentStage?: string }} props
 */
const HiringPipelineFlow = ({ compact = false, currentStage }) => {
  const currentIndex = currentStage ? PIPELINE_STEPS.indexOf(currentStage) : -1;

  return (
    <div
      className={`d-flex flex-wrap gap-2 ${compact ? "" : "mb-3"}`}
      aria-label="Interview pipeline stages"
    >
      {PIPELINE_STEPS.map((step, index) => {
        const active = step === currentStage;
        const done = currentIndex > index;
        return (
          <div
            key={step}
            className={`d-flex align-items-center gap-1 ${compact ? "small" : ""}`}
          >
            <Badge
              bg={active ? "primary" : done ? "success" : "light"}
              text={active || done ? "white" : "dark"}
              className="fw-normal"
            >
              {index + 1}. {stageLabel(step)}
            </Badge>
            {index < PIPELINE_STEPS.length - 1 && (
              <span className="text-muted">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HiringPipelineFlow;
