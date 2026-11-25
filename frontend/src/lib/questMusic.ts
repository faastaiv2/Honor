/** The Legendary quest's sounds (kept for the places that already use these names). */
import { playMusic, playSound, preloadSound, resetSounds, stopMusic } from "./sounds";

export const preloadQuestMusic = () => preloadSound("quest-music");
export const playQuestMusic = () => playMusic("quest-music");
export const stopQuestMusic = (ms = 1800) => stopMusic("quest-music", ms);
export const resetQuestMusic = () => resetSounds("quest-music");
export const preloadCrack = () => preloadSound("quest-crack");
export const playCrack = () => playSound("quest-crack");
export const resetCrack = () => resetSounds("quest-crack");
