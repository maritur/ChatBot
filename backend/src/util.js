module.exports = {
  includesAny,
  removeAll,
};

/**
 * Determines in a string includes at least one substring from an array of many
 * @param {string} string A string to be tested for the presence of the substrings
 * @param {string[]} substrings An array of substrings which may or may not be included in the tested string
 * @returns {boolean} 'true' if any of the substrings is included in the tested string, 'false' otherwise
 */
function includesAny(string, substrings) {
  for (let i = 0, len = substrings.length; i < len; i += 1) {
    if (string.includes(substrings[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Removes a copy of the original string with all the occurrences, of all of the substrings, removed
 * @param {string} string The original string
 * @param {string[]} substrings An array of substrings to remove from the original
 * @returns {string} A copy of the original string without any of the substrings included
 */
function removeAll(string, substrings) {
  let response = string;

  for (let i = 0, len = substrings.length; i < len; i += 1) {
    while (response.includes(substrings[i])) {
      response = response.replace(substrings[i], '');
    }
  }

  return response;
}
