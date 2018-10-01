const express = require('express');
const chatbot = require('./src/chatbot');

const app = express();

app.get('/chat', (request, response, next) => {
  const question = request.query.question;
  response.end(`Question: ${question}\nAnswer: ${chatbot.answer(question)}`);
});
