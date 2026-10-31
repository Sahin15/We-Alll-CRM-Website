/**
 * Expected Nova failures. status is an HTTP code the controller may return.
 */
export class AiAccessError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.name = 'AiAccessError';
    this.status = status;
  }
}
