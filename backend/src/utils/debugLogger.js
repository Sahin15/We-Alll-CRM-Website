// Debug logger - only logs if DEBUG_ATTENDANCE is set
export const debugLog = (message, data = null) => {
  if (process.env.DEBUG_ATTENDANCE === 'true') {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

export default debugLog;
