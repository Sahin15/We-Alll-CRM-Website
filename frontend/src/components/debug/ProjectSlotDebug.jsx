import { useState, useEffect } from 'react';
import { Card, Alert, Badge, Button } from 'react-bootstrap';
import projectApi from '../../api/projectApi';

const ProjectSlotDebug = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getAllProjects();
      const projectsData = response.data || response;
      
      console.log('🔍 DEBUG: Raw API response:', response);
      console.log('🔍 DEBUG: Projects data:', projectsData);
      
      setProjects(projectsData);
    } catch (error) {
      console.error('❌ DEBUG: Error loading projects:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading projects...</div>;
  if (error) return <Alert variant="danger">Error: {error}</Alert>;

  const slotEnabledProjects = projects.filter(p => p.slotConfiguration?.enableSlotSystem);

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>🔍 Project Slot System Debug</h5>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <strong>Total Projects:</strong> {projects.length} <br/>
          <strong>Slot-Enabled Projects:</strong> {slotEnabledProjects.length}
        </div>
        
        {projects.length === 0 ? (
          <Alert variant="warning">No projects found!</Alert>
        ) : (
          <div>
            <h6>All Projects:</h6>
            {projects.map(project => (
              <div key={project._id} className="border p-2 mb-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{project.name}</strong>
                    {project.slotConfiguration?.enableSlotSystem && (
                      <Badge bg="success" className="ms-2">Slot System Enabled</Badge>
                    )}
                  </div>
                  <div>
                    <small>
                      Slots: {project.slotConfiguration?.totalSlots || 'N/A'}
                    </small>
                  </div>
                </div>
                <small className="text-muted">
                  ID: {project._id} | 
                  Slot Config: {JSON.stringify(project.slotConfiguration || 'None')}
                </small>
              </div>
            ))}
          </div>
        )}
        
        <Button variant="outline-primary" size="sm" onClick={loadProjects}>
          Refresh Projects
        </Button>
      </Card.Body>
    </Card>
  );
};

export default ProjectSlotDebug;