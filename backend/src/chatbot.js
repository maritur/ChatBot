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


const tableName = 'Relatii'; // Denumirea tabelului
const subjectCol = 'Subiect'; // De aici mai jos merg denumirile celor 3 coloane
const relationCol = 'Predicat';
const complementCol = 'Complement';

module.exports = function createChatBot(connection) {
  return {
    /**
     * Răspunde la un mesaj dacă poate.
     * @param {string} message Mesajul la care trebuie de oferit un răspuns
     * @returns {Promise<string>} Răspunsul oferit
     */
    respond(message) {
      const trimmedMessage = message.trim(); // Elimin spațiile de la început și la sfârșit pentru a ușura procesarea mesajului

      const type = getType(trimmedMessage); // Determin tipul mesajului

      if (!type) { // Dacă tipul nu a putut fi determinat
        console.error(`Nu e înțeles tipul mesajului: ${message}`); // Loghez mesajul în consolă
        return messageTypeNotUnderstood; // Întorc un mesaj de eroare
      }

      const parsedMessage = parseMessage(trimmedMessage); // Procesez mesajul dintr-un șir de caractere într-un obiect
      if (!parsedMessage) return messageNotUnderstood; // Dacă mesajul nu a putut fi procesat, întorc un mesaj de eroare corespunzător

      if (type === types.statement) { // Dacă mesajul e o afirmație
        return respondToStatement(parsedMessage); // Întorc un răspuns corespunzător afirmației din mesaj
      }
      if (type === types.question) { // Dacă mesajul e o întrebare
        return respondToQuestion(parsedMessage); // Întorc un răspuns corespunzător întrebării din mesaj
      }
      if (type === types.correction) { // Dacă mesajul e o corectare
        return respondToCorrection(parsedMessage); // Întorc un răspuns corespunzător corectării din mesaj
      }

      return null; // Nu-s sigur dacă va ajunge vreodată programul la acest punct
    },
  };

  /**
   * Verifică corectitudinea afirmației din mesajul primit și oferă un răspuns pe baza acesteia
   * @param {{subject: string, relation: string, complement: string}} parsedMessage Mesajul care conține afirmația
   * @returns {Promise<string>} O confirmare - în caz că afirmația e corectă, afirmația corectă - în caz că cea primită e greșită
   */
  async function respondToStatement(parsedMessage) {
    const { subject, relation, complement } = parsedMessage; // Extrag componentele mesajului
    const sentence = await getSentence(parsedMessage); // Caut propoziția(afirmația) în baza de date
    if (sentence) return `Da, ${subject} ${relation} ${complement}.`; // Dacă am găsit propoziția(afirmația), întorc un mesaj de confirmare
    // Dacă nu am găsit afimația, înseamnă că e greșită
    const complements = await getComplements(subject, relation); // Extrag toate complementele legate de subiectul din afirmație prin relația din afirmație
    if (complements.length > 0) { // Dacă am găsit complemente, adică sunt afirmații cu același subiect și relație
      const cmpResults = await Promise.all(complements.map(itComplement => isEqual(complement, itComplement))); // Compar toate complementele cu cel din afirmația primită

      for (let i = 0; i < cmpResults.length; i += 1) {
        if (cmpResults[i]) { // Dacă este vreun complemente care e "egal" cu cel afirmația primită
          return `Nu, ${subject} ${relation} ${complements[i]}`; // Întorc un mesaj cu afirmația corectă
        }
      }
    }
    // Dacă nu am găsit nicio afirmație cu subiectul și cu relația primită, înseamnă că nu există și deci o învăț pe aceasta
    const learnQuery = `INSERT INTO \`${tableName}\` (\`${subjectCol}\`,\`${relationCol}\`,\`${complementCol}\`) VALUES (?, ?, ?)`; // Creez interogarea de învățare a afirmației
    await connection.execute(learnQuery, [subject, relation, complement]); // Execut interogarea de învățare
    // TODO: Ar trebui să verific dacă sunt erori aici
    return didntKnow;
  }

  /**
   * Verifică dacă 2 subiecte sunt legate prin aceeași relație de un complement
   * @param {string} subject1 Primul subiect
   * @param {string} subject2 Al doilea subiect
   * @returns {Promise<boolean>}
   */
  async function isEqual(subject1, subject2) {
    const query = `SELECT \`${subjectCol}\`, \`${relationCol}\`, \`${complementCol}\` FROM \`${tableName}\` WHERE \`${subjectCol}\` = ?`; // Interogare de ex

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

  /**
   * Extrage complementele legate de subiectul specificat prin relația specificată
   * @param {string} subject Subiectul pentru care de căutat complementele
   * @param {string} relation Relația prin care subiectul să fie legate de complemente
   * @returns {Promise<string[]>} Lista de complemente
   */
  async function getComplements(subject, relation) {
    const query2 = `SELECT \`${complementCol}\` FROM \`${tableName}\` WHERE \`${subjectCol}\` = ? AND \`${relationCol}\` = ?`;
    const query2Results = await connection.execute(query2, [subject, relation]);
    const complements = query2Results[0].map(getComplementFromRow);

    return complements;
  }

  /**
   * Găsește o propoziție (triplu) în baza de date, dacă există (probabil trebuia să-l fac bool)
   * @param {{subject: string, relation: string, complement: string}} parsedMessage Mesajul ce conține triplul de căutat
   * @returns {Promise<{subject?: string, relation?: string, complement?: string}>} Cam aceeși propoziție - dacă a găsit-o, null - dacă nu a găsit-o
   */
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

  /**
   * Execută o corectarea și oferă un răspuns corespunzător
   * @param {{subject: string, relation: string, complement: string}} parsedMessage Mesajul cu informația corectă
   * @returns {Promise<string>} Mesajul de finisarea a corectării
   */
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

  /**
   * Procesează o întrebare și oferă un răspuns pentru aceasta
   * @param {{subject: string, relation: string, complement: string}} parsedMessage Mesajul ce conține întrebarea
   * @returns {Promise<string>} Un mesaj cu răspunsul la întrebare
   */
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
   * Determină tipul unui mesaj
   * @param {string} trimmedMessage Mesajul pentru care trebuie de determinat tipul
   * @returns {string} 'QUESTION', 'CORRECTION', 'STATEMENT' sau null
   */
  function getType(trimmedMessage) {
    const lastChar = trimmedMessage.charAt(trimmedMessage.length - 1);
    if (lastChar === '?') return types.question;
    if (lastChar === '!') return types.correction;
    if (lastChar === '.') return types.statement;
    return null;
  }

  /**
   * Transformă un mesaj dintr-un șir de caractere într-un obiect
   * @param {string} message Șirul de caractere care reprezintă mesajul
   * @returns {{subject: string, relation: string, complement: string}} Mesajul în formă de obiect
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
   * Transformă un rând din baza de date într-un obiect
   * @param {string} row Rândul din baza de date
   * @returns {{subject?: string, relation?: string, complement?: string}} Obiectul primit în urma transformării
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

  /**
   * Extrage subiectul dintr-un rând din baza de date
   * @param {string} row Rândul provenit din baza de date
   * @returns {string} Subiectul extras
   */
  function getSubjectFromRow(row) {
    return row.Subiect.toLocaleLowerCase();
  }

  /**
   * Extrage relația(predicatul) dintr-un rând din baza de date
   * @param {string} row Rândul provenit din baza de date
   * @returns {string} Relația extrasă
   */
  function getRelationFromRow(row) {
    return row.Predicat.toLocaleLowerCase();
  }

  /**
   * Extrage complementul dintr-un rând din baza de date
   * @param {string} row Rândul provenit din baza de date
   * @returns {string} Complementul extras
   */
  function getComplementFromRow(row) {
    return row.Complement.toLocaleLowerCase();
  }

  /**
   * Verifică dacă între un subiect și un complement există un lanț pe baza unei și aceeași relații
   * @param {string} subject Subiect studiat
   * @param {string} complement Complementul studiat
   * @param {string} relation Relația pe baza căreia se presupune să fie construit lanțul
   * @returns {Promise<boolean>} 'true' - dacă există lanțul, 'false' - dacă nu
   */
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
};
