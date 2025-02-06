import { CUSTOM_PROTOCOL } from '../constants/config';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getCustomProtocolUrl = (argv: any): string => {
  console.log('in get cumstom protocol');
  const customProtocolPrefix = `${CUSTOM_PROTOCOL}://`;
  let url = argv.find((arg: any) => arg.startsWith(customProtocolPrefix));
  console.log('url line 8 get custom protocol', url);
  if (url) {
    url = url.replace(customProtocolPrefix, '');
  }

  return url;
};