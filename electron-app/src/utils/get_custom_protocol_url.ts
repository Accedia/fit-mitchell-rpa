import { CUSTOM_PROTOCOL } from '../constants/config';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getCustomProtocolUrl = (argv: any): string => {
  console.log('in get cumstom protocol');
  const customProtocolPrefix = `${CUSTOM_PROTOCOL}://https//`;
  let url = argv.find((arg: any) => arg.startsWith(customProtocolPrefix));
  console.log('url line 8 get custom protocol', url);
  if (url) {
    url = url.replace(customProtocolPrefix, 'https://');
  }

  return url;
};

//This is for testing purposes locally only
// export const getCustomProtocolUrl = (argv: any): string => {
//   const customProtocolPrefix = `${CUSTOM_PROTOCOL}://http//`;
//   let url = argv.find((arg: any) => arg.startsWith(customProtocolPrefix));
//   if (url) {
//     url = url.replace(customProtocolPrefix, 'http://');
//   }

//   return url;
// };