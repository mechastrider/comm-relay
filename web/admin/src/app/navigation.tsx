import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
export type Period = "session" | "day" | "all";
export type LiveTab = "messages" | "leaderboard" | "statistics" | "contracts";
interface ContractDraft {
  title: string;
  objective: string;
  rewardID: string;
}
interface Navigation {
  contractDraft: ContractDraft;
  setContractDraft: Dispatch<SetStateAction<ContractDraft>>;
  period: Period;
  setPeriod: Dispatch<SetStateAction<Period>>;
  liveTab: LiveTab;
  setLiveTab: Dispatch<SetStateAction<LiveTab>>;
}
const Context = createContext<Navigation | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [contractDraft, setContractDraft] = useState<ContractDraft>({
    title: "",
    objective: "",
    rewardID: "",
  });
  const [period, setPeriod] = useState<Period>("session");
  const [liveTab, setLiveTab] = useState<LiveTab>("messages");
  return (
    <Context.Provider
      value={{
        contractDraft,
        setContractDraft,
        period,
        setPeriod,
        liveTab,
        setLiveTab,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNavigation() {
  const context = useContext(Context);
  if (!context) throw new Error("NavigationProvider is missing");
  return context;
}
