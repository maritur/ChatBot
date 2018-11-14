module.exports = {
  /**
   * This answers just one question as a demo function
   * @param {string} question The question for which the chatbot should provide an answer
   */
  answer(question) {
    if (question === 'Who are you?') return 'I AM CHATBOT!!!';

    return "I don't understand your question.";
  },
};
