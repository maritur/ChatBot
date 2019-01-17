const express = require('express');
const mysql = require('mysql2/promise');
const config = require('config');

const createChatBot = require('./src/chatbot');

async function main() {
  const app = express();

  const connection = await mysql.createConnection(`${config.mysql_uri}/${config.mysql_db}`);

  const chatbot = createChatBot(connection);

  app.get('/chat', async (request, response) => {
    const { question } = request.query;
    const answer = await chatbot.respond(question);

    response.set('Access-Control-Allow-Origin', '*');
    response.status(200).json(answer);

    console.log(`Message: ${question}\nResponse: ${JSON.stringify(answer)}`);
  });

  app.listen(8080, '0.0.0.0');
}

main()
  .then(() => {
    console.log('### Server up ###');
  })
  .catch((error) => {
    if (error) {
      if (error.code === "ECONNREFUSED") {
        console.error("Eroare: Nu a putut fi stabilita o conexiune la baza de date.\n        Asigurati-vi ca baza de date e pornita si accesibila");
      } else {
        console.error(error);
      }
    }
  });
