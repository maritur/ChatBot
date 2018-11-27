#!/usr/bin/env node

const mysql = require('mysql2/promise');
const config = require('config');

async function main() {
  const connection = await mysql.createConnection(`${config.mysql_uri}/${config.mysql_db}`);

  let query = 'CREATE TABLE IF NOT EXISTS facts (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT, subject VARCHAR(256) NOT NULL, relation VARCHAR(256) NOT NULL, object VARCHAR(256) NOT NULL)';
  let response = await connection.execute(query);
  console.log(response);

  query = 'REPLACE INTO `facts` (id, subject, relation, object) VALUES (1, "albastru", "este", "culoare"), (2, "cerul", "este", "albastru")';
  response = await connection.execute(query);
  console.log(response);
}

main()
  .then(() => {
    console.log('### Done ###');
    process.exit(0);
  })
  .catch(console.error);
