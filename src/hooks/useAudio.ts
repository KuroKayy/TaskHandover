import { play } from '../lib/audio';

export function useAudio() {
  return {
    playComplete: () => play('complete', 0.6),
    playNewTask: () => play('new-task', 0.5),
  };
}
