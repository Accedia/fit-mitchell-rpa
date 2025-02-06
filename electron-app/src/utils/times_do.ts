import { Key, keyboard } from 'test-fork-nutjs';
import { snooze } from './snooze';

type DoCallback = (index?: number) => Promise<void>;

const doFn = async (times: number, cb: DoCallback) => {
  for (let i = 0; i < times; i++) {
    await cb(i);
  }
};

const pressKey = async (times: number, key: Key) => {
  for (let i = 0; i < times; i++) {
    await keyboard.pressKey(key);
    await snooze(250)
  }
};

export const times = (number: number) => {
  return {
    do: async (cb: DoCallback) => {
      await doFn(number, cb)
    },
    pressKey: async (key: Key) => {
      await pressKey(number, key)
    }
  };
};
