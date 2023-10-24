import { CUSTOM_PROTOCOL } from '../constants/config';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getCustomProtocolUrl = (argv: any): string => {
  const customProtocolPrefix = `${CUSTOM_PROTOCOL}://`;
  let url = argv.find((arg: any) => arg.startsWith(customProtocolPrefix));
  if (url) {
    url = url.replace(customProtocolPrefix, '');
  }

  return url;
};