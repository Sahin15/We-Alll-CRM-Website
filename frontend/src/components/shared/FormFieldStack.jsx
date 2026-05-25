import { Row, Col } from "react-bootstrap";
import { useBreakpoint } from "../../context/BreakpointContext";

/** Stacks form fields single-column on app-mobile; preserves Col layout on desktop. */
const FormFieldStack = ({ children, md = 6, lg = 4 }) => {
  const { isAppMobile } = useBreakpoint();

  if (isAppMobile) {
    return <div className="d-flex flex-column gap-3">{children}</div>;
  }

  return (
    <Row className="g-3">
      {Array.isArray(children)
        ? children.map((child, i) => (
            <Col key={i} md={md} lg={lg}>
              {child}
            </Col>
          ))
        : children}
    </Row>
  );
};

export default FormFieldStack;
