import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
type Status = "saved" | "dirty" | "saving";
const Context = createContext<{
  status: Status;
  report: (id: string, value?: Status) => void;
}>({ status: "saved", report: () => undefined });
export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [owners, setOwners] = useState<Record<string, Status>>({});
  const report = useCallback(
    (id: string, value?: Status) =>
      setOwners((current) => {
        if (current[id] === value) return current;
        const next = { ...current };
        if (value) next[id] = value;
        else delete next[id];
        return next;
      }),
    [],
  );
  const status = Object.values(owners).includes("saving")
    ? "saving"
    : Object.values(owners).includes("dirty")
      ? "dirty"
      : "saved";
  return (
    <Context.Provider value={{ status, report }}>{children}</Context.Provider>
  );
}
export function useSaveStatus() {
  return useContext(Context).status;
}
export function useReportSaveStatus(dirty: boolean, saving = false) {
  const id = useId(),
    { report } = useContext(Context);
  useEffect(() => {
    report(id, saving ? "saving" : dirty ? "dirty" : "saved");
    return () => report(id);
  }, [id, report, dirty, saving]);
}
