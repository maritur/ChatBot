const express = require('express');
const chatbot = require('./src/chatbot');

const app = express();

app.get('/chat', (request, response, next) => {
  const question = request.query.question;
  console.log(`Question: ${question}\nAnswer: ${chatbot.answer(question)}`);
  response.set('Access-Control-Allow-Origin', '*');
  response.status(200).json(chatbot.answer(question));
});

app.listen(8080, '0.0.0.0');
