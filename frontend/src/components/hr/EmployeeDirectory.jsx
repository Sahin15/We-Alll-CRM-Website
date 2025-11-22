import { useState, useEffect } from "react";
import { Card, Form, InputGroup, Table, Badge, Button, Spinner } from "react-bootstrap";
import { FaSearch, FaUser, FaEnvelope, FaPhone, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { userApi } from "../../api/userApi";
import { toast } from "react-toastify";

const EmployeeDirectory = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployeeList();
  }, [searchTerm, filterDepartment, filterStatus, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAllUsers();
      const employeeList = response.data?.filter((u) => u.role === "employee") || [];
      setEmployees(employeeList);
      setFilteredEmployees(employeeList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const filterEmployeeList = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(
        (emp) => emp.department?.name === filterDepartment
      );
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter((emp) => emp.status === filterStatus);
    }

    setFilteredEmployees(filtered);
  };

  const departments = [...new Set(employees.map((e) => e.department?.name).filter(Boolean))];

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <FaUser className="me-2 text-primary" />
              Employee Directory
            </h5>
            <small className="text-muted">
              {filteredEmployees.length} of {employees.length} employees
            </small>
          </div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => navigate("/employees")}
          >
            View All
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Search and Filters */}
        <div className="mb-3">
          <InputGroup className="mb-2">
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              size="sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          </div>
        </div>

        {/* Employee List */}
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <FaUser size={40} className="mb-2 opacity-50" />
            <p>No employees found</p>
          </div>
        ) : (
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            <Table hover responsive className="mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.slice(0, 10).map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <div>
                        <strong>{emp.name}</strong>
                        <br />
                        <small className="text-muted">{emp.employeeId}</small>
                      </div>
                    </td>
                    <td>{emp.department?.name || "N/A"}</td>
                    <td>
                      <div className="small">
                        <div>
                          <FaEnvelope className="me-1" />
                          {emp.email}
                        </div>
                        {emp.phone && (
                          <div>
                            <FaPhone className="me-1" />
                            {emp.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge bg={emp.status === "active" ? "success" : "secondary"}>
                        {emp.status || "active"}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(`/users/${emp._id}`)}
                      >
                        <FaEye />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default EmployeeDirectory;
