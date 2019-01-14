const util = require('./util');

const types = {
  question: 'QUESTION',
  statement: 'STATEMENT',
  correction: 'CORRECTION',
};

const messageNotUnderstood = 'Nu înțeleg mesajul.';
const messageTypeNotUnderstood = 'Nu înțeleg tipul mesajului';
const questionNotUnderstood = 'Nu înțeleg întrebarea';
const dontKnow = 'Nu știu';
const didntKnow = 'Nu știam, dar de acum voi ști';

// Acest mesaj va trebui înlocuit peste tot cu mesaje specifice pentru fiecare caz sau poate chiar răspunsuri
// const thisIsWIP = 'Încă nu știu cum să răspund la așa tip de mesaj, dar probabil voi ști pe viitor, așa că încearcă din nou peste câteva zile :)';

const tableName = 'Relatii'; // Denumirea tabelului
const subjectCol = 'Subiect'; // De aici mai jos merg denumirile celor 3 coloane
const relationCol = 'Predicat';
const complementCol = 'Complement';

module.exports = function createChatBot(connection) {
  return {
    /**
     * Provides a response for a message if it can.
     * @param {string} message The message for which the chatbot should provide an response
     * @returns {string} The response
     */
    respond(message) {
      const trimmedMessage = message.trim();

      const type = getType(trimmedMessage);

      if (!type) {
        // Dacă mesajul nu se termină cu punct
        console.error(`Nu e înțeles tipul mesajului: ${message}`);
        return messageTypeNotUnderstood;
      }

      const parsedMessage = parseMessage(trimmedMessage);
      if (!parsedMessage) return messageNotUnderstood;

      if (type === types.statement) return respondToStatement(parsedMessage);
      if (type === types.question) return respondToQuestion(parsedMessage);
      if (type === types.correction) return respondToCorrection(parsedMessage);

      return null;
    },
  };

  async function respondToStatement(parsedMessage) {
    const { subject, relation, complement } = parsedMessage;
    const sentence = await getSentence(parsedMessage); // Caută propoziția și o întoarce dacă o găsește
    if (sentence) return `Da, ${subject} ${relation} ${complement}.`;

    const complements = await getComplements(subject, relation);
    if (complements.length > 0) {
      const cmpResults = await Promise.all(complements.map(itComplement => isEqual(complement, itComplement)));

      for (let i = 0; i < cmpResults.length; i += 1) {
        if (cmpResults[i]) {
          return `Nu, ${subject} ${relation} ${complements[i]}`;
        }
      }
    }

    const learnQuery = `INSERT INTO \`${tableName}\` (\`${subjectCol}\`,\`${relationCol}\`,\`${complementCol}\`) VALUES (?, ?, ?)`;
    await connection.execute(learnQuery, [subject, relation, complement]); // TODO: Ar trebui să verific dacă sunt erori aici
    return didntKnow;
  }

  async function isEqual(subject1, subject2) {
    const query = `SELECT \`${subjectCol}\`, \`${relationCol}\`, \`${complementCol}\` FROM \`${tableName}\` WHERE \`${subjectCol}\` = ?`;

    const results1 = await connection.execute(query, [subject1]);
    const sentences1 = results1[0].map(parseRow);
    if (sentences1.length === 0) return false;

    const results2 = await connection.execute(query, [subject2]);
    const sentences2 = results2[0].map(parseRow);
    if (sentences2.length === 0) return false;

    for (let i = 0, len1 = sentences1.length, len2 = sentences2.length; i < len1 && i < len2; i += 1) {
      if (sentences1[i].relation === sentences2[i].relation && sentences1[i].complement === sentences2[i].complement) return true;
    }

    return false;
  }

  async function getComplements(subject, relation) {
    const query2 = `SELECT \`${complementCol}\` FROM \`${tableName}\` WHERE \`${subjectCol}\` = ? AND \`${relationCol}\` = ?`;
    const query2Results = await connection.execute(query2, [subject, relation]);
    const complements = query2Results[0].map(getComplementFromRow);

    return complements;
  }

  async function getSentence(parsedMessage) {
    const { subject, relation, complement } = parsedMessage;
    const query1 = `SELECT \`${subjectCol}\`, \`${relationCol}\`, \`${complementCol}\` FROM \`${tableName}\` WHERE \`${subjectCol}\` = ? AND \`${relationCol}\` = ? AND \`${complementCol}\` = ?`;
    const query1Results = await connection.execute(query1, [subject, relation, complement]);
    const query1Rows = query1Results[0];

    if (query1Rows.length > 0) {
      // Dacă a găsit cel puțin o propoziție, oricum restul sunt duplicate
      if (query1Rows.length > 1) console.log(`Avertizare: Sunt mai multe propoziții la prima interogare: ${query1Rows}`);

      return parseRow(query1Rows[0]); // pur și simplu trec din formatul bazei de date în formatul definit în cod, deși pot face să fie același format
    }

    return null;
  }

  async function respondToCorrection(parsedMessage) {
    const { subject, relation, complement } = parsedMessage;
    if (subject === '_' || relation === '_' || complement === '_') return messageNotUnderstood;

    let conflictingComplement;
    const complements = await getComplements(subject, relation);
    if (complements.length > 0) {
      const cmpResults = await Promise.all(complements.map(itComplement => isEqual(complement, itComplement)));

      for (let i = 0; i < cmpResults.length; i += 1) {
        if (cmpResults[i]) {
          conflictingComplement = complements[i];
        }
      }
    }
    if (!conflictingComplement) {
      const learnQuery = `INSERT INTO \`${tableName}\` (\`${subjectCol}\`,\`${relationCol}\`,\`${complementCol}\`) VALUES (?, ?, ?)`;
      await connection.execute(learnQuery, [subject, relation, complement]); // TODO: Ar trebui să verific dacă sunt erori aici
      return didntKnow;
    }

    const relearnQuery = `UPDATE \`${tableName}\` SET \`${complementCol}\` = ? WHERE \`${complementCol}\` = ?`;
    await connection.execute(relearnQuery, [complement, conflictingComplement]);
    return `OK, ${subject} ${relation} ${complement}`;
  }

  async function respondToQuestion(parsedMessage) {
    const { subject, relation, complement } = parsedMessage;

    if (subject === '_' && relation !== '_' && complement !== '_') {
      const query = `SELECT \`${subjectCol}\` FROM \`${tableName}\` WHERE \`${relationCol}\` = ? AND \`${complementCol}\` = ?`;
      const results = await connection.execute(query, [relation, complement]);
      const subjects = results[0].map(getSubjectFromRow);

      if (subjects.length === 0) return dontKnow;

      return subjects;
    }
    if (complement === '_' && subject !== '_' && relation !== '_') {
      const query = `SELECT \`${complementCol}\` FROM \`${tableName}\` WHERE \`${subjectCol}\` = ? AND \`${relationCol}\` = ?`;
      const results = await connection.execute(query, [subject, relation]);
      const complements = results[0].map(getComplementFromRow);

      if (complements.length === 0) return dontKnow;

      return complements;
    }
    if (relation === '_' && subject !== '_' && complement !== '_') {
      const query = `SELECT \`${relationCol}\` FROM \`${tableName}\` WHERE \`${subjectCol}\` = ? AND \`${complementCol}\` = ?`;
      const results = await connection.execute(query, [subject, complement]);
      const relations = results[0].map(getRelationFromRow);

      if (relations.length === 0) return dontKnow;

      return relations;
    }
    if (subject !== '_' && relation !== '_' && complement !== '_') {
      if (await getSentence(parsedMessage)) {
        return 'Adevărat';
      }
      if (await areRelatedThrough(subject, complement, relation)) {
        return 'Adevărat';
      }
      return 'Fals';
    }

    console.error(`Probleme cu întrebarea: '${subject} ${relation} ${complement}'`);
    return questionNotUnderstood;
  }

  /**
   * Determines the type of a message.
   * @param {string} trimmedMessage The message for which the type should be determined
   * @returns {string} Either 'QUESTION', 'CORRECTION', 'STATEMENT' or null
   */
  function getType(trimmedMessage) {
    const lastChar = trimmedMessage.charAt(trimmedMessage.length - 1);
    if (lastChar === '?') return types.question;
    if (lastChar === '!') return types.correction;
    if (lastChar === '.') return types.statement;
    return null;
  }

  /**
   * Transforms a message from a string into an object
   * @param {string} message The string containing the message
   * @returns {{subject: string, relation: string, complement: string}} A structured version of the message
   */
  function parseMessage(message) {
    const parts = message.toLocaleLowerCase().split(' '); // NOTE: Totul e în litere minuscule
    const len = parts.length;
    if (len < 3 || len > 4) return null;

    let [subject, relation, complement] = parts; // eslint-disable-line prefer-const
    if (len === 3) {
      complement = util.removeAll(complement, ['.', '?', '!']);
    }

    return {
      subject,
      relation,
      complement,
    };
  }

  /**
 * Transforms a row from the database into an object
 * @param {string} row The row containing the sentece
 * @returns {{subject?: string, relation?: string, complement?: string}} A structured version of the row
 */
  function parseRow(row) {
    if (!row) return null;

    const subject = row.Subiect ? row.Subiect.toLocaleLowerCase() : null;
    const relation = row.Predicat ? row.Predicat.toLocaleLowerCase() : null;
    const complement = row.Complement ? row.Complement.toLocaleLowerCase() : null;

    return {
      subject,
      relation,
      complement,
    };
  }

  function getSubjectFromRow(row) {
    return row.Subiect.toLocaleLowerCase();
  }

  function getRelationFromRow(row) {
    return row.Predicat.toLocaleLowerCase();
  }

  function getComplementFromRow(row) {
    return row.Complement.toLocaleLowerCase();
  }

  async function areRelatedThrough(subject, complement, relation) {
    const relatedQuery = `SELECT \`${subjectCol}\`, \`${complementCol}\` FROM \`${tableName}\` WHERE \`${relationCol}\` = ?`;
    const results = await connection.execute(relatedQuery, [relation]);

    let complements = [complement];
    while (true) {
      const subjects = results[0].map(parseRow).filter(parsedRow => complements.indexOf(parsedRow.complement) != -1).map(parsedRow => parsedRow.subject);
      if (subjects.length == 0) {
        return false;
      } else {
        if (subjects.indexOf(subject) != -1) {
          return true;
        } else {
          complements = subjects;
        }
      }

    }
  }

  // /**
  //  * Rudimentary check for statement validity
  //  * @param {{subject: string, relation: string, complement: string}} parsedMessage The parsed message representing a statement that should be checked
  //  * @returns {{valid: boolean; correction: string}}
  //  */
  // async function verifyStatement(parsedMessage) {
  //   let query = 'SELECT `subject`, `relation`, `object` FROM `facts` WHERE `subject` = ? AND `relation` = ?';
  //   const { subject, relation, complement } = parsedMessage;
  //   const [rows, fields] = await connection.execute(query, [subject, relation]); // eslint-disable-line no-unused-vars
  //   if (!rows || rows.length === 0) {
  //     query = 'INSERT INTO `facts` (subject, relation, object) VALUES (?, ?, ?)';
  //     await connection.execute(query, [subject, relation, complement]);
  //     return null;
  //   }

  //   // There should only 1 row here, at least for now
  //   if (rows[0].object === complement) return { valid: true };

  //   return {
  //     valid: false,
  //     correction: `${subject} ${relation} ${rows[0].object}.`,
  //   };
  // }
};
