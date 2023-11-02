import log from 'electron-log';
export const extractSessionIdFromUrl = (url: string): string => {
  const sessionIdRegex = /(?<=sessionId=)(.*)(?=&orderId)/;
  const [sessionId] = url.match(sessionIdRegex);
  log.info('sessionId', sessionId)
  return sessionId;
};
