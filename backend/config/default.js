module.exports = {
  mysql_uri: process.env.MYSQL_URI || 'mysql://user:password@localhost:3306',
  mysql_db: process.env.MYSQL_DB || 'chatbot',
  development: {
    username: process.env.SEQUELIZE_USER || 'root',
    password: process.env.SEQUELIZE_PASSWORD || 'pass',
    database: process.env.SEQUELIZE_DB || 'db',
    host: process.env.SEQUELIZE_HOST || 'localhost',
    dialect: process.env.SEQUELIZE_DIALECT || 'mysql',
  },
};
