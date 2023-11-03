import log from 'electron-log';

export const extractSessionIdFromUrl = (url: string): string => {
  const sessionIdRegex = /(?<=sessionId=)(.*)(?=&automationId)/;
  const [sessionId] = url.match(sessionIdRegex);
  return sessionId;
};
