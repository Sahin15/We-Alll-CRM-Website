import Project from "../models/projectModel.js";
import logger from "../utils/logger.js";

/**
 * Removes an employee from all projects they are assigned to.
 * Handles assignedUsers, teamMembers, and projectHead fields.
 * Processes each project independently — errors on one project do not
 * stop processing of the remaining projects.
 *
 * @param {string|ObjectId} employeeId
 * @returns {Promise<number>} count of projects successfully modified
 */
export const removeEmployeeFromAllProjects = async (employeeId) => {
  let projectsAffected = 0;

  try {
    // Find all projects where the employee appears in any capacity
    const projects = await Project.find({
      $or: [
        { assignedUsers: employeeId },
        { teamMembers: employeeId },
        { projectHead: employeeId },
      ],
    }).select("_id name assignedUsers teamMembers projectHead");

    for (const project of projects) {
      try {
        const update = {};

        if (
          project.assignedUsers &&
          project.assignedUsers.some((id) => id.toString() === employeeId.toString())
        ) {
          update.$pull = { ...(update.$pull || {}), assignedUsers: employeeId };
        }

        if (
          project.teamMembers &&
          project.teamMembers.some((id) => id.toString() === employeeId.toString())
        ) {
          update.$pull = { ...(update.$pull || {}), teamMembers: employeeId };
        }

        if (
          project.projectHead &&
          project.projectHead.toString() === employeeId.toString()
        ) {
          update.$set = { projectHead: null };
        }

        if (Object.keys(update).length > 0) {
          await Project.findByIdAndUpdate(project._id, update);
          projectsAffected++;
        }
      } catch (err) {
        logger.error(
          `projectRemovalService: failed to remove employee ${employeeId} from project ${project._id}: ${err.message}`
        );
        // Continue processing remaining projects
      }
    }

    logger.info(
      `projectRemovalService: removed employee ${employeeId} from ${projectsAffected} project(s)`
    );
  } catch (err) {
    logger.error(
      `projectRemovalService: failed to query projects for employee ${employeeId}: ${err.message}`
    );
  }

  return projectsAffected;
};
