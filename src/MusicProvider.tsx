import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MusicPlayer } from "./music-player";

const MusicContext = createContext<MusicPlayer | null>(null);
export function MusicProvider({ children }: { children: ReactNode }) {
  const [player] = useState(() => new MusicPlayer());
  useEffect(() => () => player.dispose(), [player]);
  return (
    <MusicContext.Provider value={player}>{children}</MusicContext.Provider>
  );
}
export function useMusic() {
  const player = useContext(MusicContext);
  if (!player) throw new Error("MusicProvider must wrap the app root");
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  return { ...state, player };
}
