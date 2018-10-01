'use strict';

module.exports = {
  /**
   * 
   * @param {string} question The question for which the chatbot should provide an answer
   */
  answer(question) {
    if (question === 'Who are you?') {
      return 'I AM CHATBOT!!!';
    } else {
      return `I don't understand your question.`;
    }
  },
};
