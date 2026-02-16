/**
 * Decode HTML entities in text
 * Converts &#x27; back to ' and other HTML entities to their original characters
 */
export const decodeHtmlEntities = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Create a temporary element to decode HTML entities
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

/**
 * Decode HTML entities in an object's string properties
 */
export const decodeObjectHtmlEntities = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const decoded = { ...obj };
  
  Object.keys(decoded).forEach(key => {
    if (typeof decoded[key] === 'string') {
      decoded[key] = decodeHtmlEntities(decoded[key]);
    } else if (Array.isArray(decoded[key])) {
      decoded[key] = decoded[key].map(item => 
        typeof item === 'string' ? decodeHtmlEntities(item) : item
      );
    } else if (typeof decoded[key] === 'object' && decoded[key] !== null) {
      decoded[key] = decodeObjectHtmlEntities(decoded[key]);
    }
  });
  
  return decoded;
};

/**
 * Decode HTML entities in an array of objects
 */
export const decodeArrayHtmlEntities = (array) => {
  if (!Array.isArray(array)) return array;
  
  return array.map(item => 
    typeof item === 'object' ? decodeObjectHtmlEntities(item) : 
    typeof item === 'string' ? decodeHtmlEntities(item) : item
  );
};