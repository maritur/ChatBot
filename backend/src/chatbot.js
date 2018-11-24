const util = require('./util');

const types = {
  question: 'QUESTION',
  statement: 'STATEMENT',
  correction: 'CORRECTION',
};

const basicError = "I don't understand your question.";

module.exports = function createChatBot(connection) {
  return {
    /**
     * Provides a response for a message if it can.
     * @param {string} message The message for which the chatbot should provide an response
     * @returns {string} The response
     */
    async respond(message) {
      const trimmedMessage = message.toLocaleLowerCase().trim(); // eslint-disable-line no-param-reassign

      const type = getType(trimmedMessage);

      const parsedMessage = parseMessage(trimmedMessage);
      if (!parsedMessage) return basicError;

      if (type === types.statement) {
        const result = await verifyStatement(parsedMessage);
        if (!result) return 'Nu știam';
        if (result.correction) return `Nu, ${result.correction}`;

        return `Da, ${trimmedMessage}`;
      }

      const query = 'SELECT * FROM `facts`';

      const [rows] = await connection.execute(query);

      console.log(`\nRows:\n${JSON.stringify(rows)}`);

      return rows;
    },
  };

  /**
   * Determines the type of a message.
   * @param {string} message The message for which the type should be determined
   * @returns {string} Either 'QUESTION', 'CORRECTION' or 'STATEMENT'
   */
  function getType(trimmed) {
    const lastChar = trimmed.charAt(trimmed.length - 1);
    if (lastChar === '?') return types.question;
    if (lastChar === '!') return types.correction;

    return types.statement;
  }

  /**
   * Transforms a message from a string into an object
   * @param {string} message The string containing the message
   * @returns {{subject: string, relation: string, object: string}} A structured version of the message
   */
  function parseMessage(message) {
    const parts = message.split(' '); // TODO: Get rid of the punctuation
    const len = parts.length;
    if (len < 3 || len > 4) return null;

    let [subject, relation, object] = parts; // eslint-disable-line prefer-const
    if (len === 3) {
      object = util.removeAll(object, ['.', '?', '!']);
    }

    return {
      subject,
      relation,
      object,
    };
  }

  /**
   * Rudimentary check for statement validity
   * @param {{subject: string, relation: string, object: string}} parsedMessage The parsed message representing a statement that should be checked
   * @returns {{valid: boolean; correction: string}}
   */
  async function verifyStatement(parsedMessage) {
    let query = 'SELECT `subject`, `relation`, `object` FROM `facts` WHERE `subject` = ? AND `relation` = ?';
    const { subject, relation, object } = parsedMessage;
    const [rows, fields] = await connection.execute(query, [subject, relation]); // eslint-disable-line no-unused-vars
    if (!rows || rows.length === 0) {
      query = 'INSERT INTO `facts` (subject, relation, object) VALUES (?, ?, ?)';
      await connection.execute(query, [subject, relation, object]);
      return null;
    }

    // There should only 1 row here, at least for now
    if (rows[0].object === object) return { valid: true };

    return {
      valid: false,
      correction: `${subject} ${relation} ${rows[0].object}.`,
    };
  }
};
