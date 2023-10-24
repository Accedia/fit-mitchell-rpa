export const extractSessionIdFromUrl = (url: string): string => {
  const sessionIdRegex = /(?<=sessionId=)(.*)(?=&orderId)/;
  const [sessionId] = url.match(sessionIdRegex);
  return sessionId;
};
