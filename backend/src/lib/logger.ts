import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    // log to console
    new winston.transports.Console(),
    // log to file
    // new winston.transports.File({ filename: 'loggin_file.log' }),
  ],
});
