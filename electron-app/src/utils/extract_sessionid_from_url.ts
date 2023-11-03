import log from 'electron-log';

export const extractSessionIdFromUrl = (url: string): string => {
  log.info('enters in the session function')
  const sessionIdRegex = /(?<=sessionId=)(.*)(?=&automationId)/;
  const [sessionId] = url.match(sessionIdRegex);
  log.info('sessionId', sessionId)
  return sessionId;
};
