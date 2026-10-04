import { SaveStatusProvider } from "./app/save-status";
import { StrictMode, Suspense, lazy, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, Navigate } from "react-router";
import { LocaleProvider } from "./app/locale";
import { RuntimeProvider, useRuntime } from "./app/runtime";
import { Shell } from "./app/Shell";
import { Wordmark } from "./components/Wordmark";
const Settings = lazy(() =>
  import("./features/settings/Settings").then((module) => ({
    default: module.Settings,
  })),
);
const About = lazy(() =>
  import("./features/About").then((module) => ({ default: module.About })),
);
const Studio = lazy(() =>
  import("./features/studio/Studio").then((module) => ({
    default: module.Studio,
  })),
);
import { Live } from "./features/live/Live";
import { LeaderboardProvider } from "./features/live/leaderboard-store";
import { MessagesProvider } from "./features/live/MessagesProvider";
const Viewers = lazy(() =>
  import("./features/audience/Viewers").then((module) => ({
    default: module.Viewers,
  })),
);
import { Audience } from "./features/audience/Audience";
const Archive = lazy(() =>
  import("./features/audience/Archive").then((module) => ({
    default: module.Archive,
  })),
);
const History = lazy(() =>
  import("./features/audience/History").then((module) => ({
    default: module.History,
  })),
);
const Catalog = lazy(() =>
  import("./features/catalog/Catalog").then((module) => ({
    default: module.Catalog,
  })),
);
const Greetings = lazy(() =>
  import("./features/catalog/Greetings").then((module) => ({
    default: module.Greetings,
  })),
);
const Progression = lazy(() =>
  import("./features/audience/Progression").then((module) => ({
    default: module.Progression,
  })),
);
import { NavigationProvider } from "./app/navigation";
import "./styles.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <main role="alert">
          <h1><Wordmark /></h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => location.reload()}>
            Reload / Перезагрузить
          </button>
        </main>
      );
    return this.props.children;
  }
}
function AboutPage() {
  const { diagnostics } = useRuntime();
  return <About version={diagnostics?.app_version ?? "unknown"} />;
}
const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/live" replace /> },
      { path: "/live", element: <Live /> },
      { path: "/studio", element: <Studio /> },
      {
        path: "/audience",
        element: <Audience />,
        children: [
          { index: true, element: <Viewers /> },
          { path: "progression", element: <Progression /> },
          { path: "greetings", element: <Greetings /> },
          { path: "archive", element: <Archive /> },
          { path: "history", element: <History /> },
          {
            path: "commands",
            element: <Catalog key="commands" kind="commands" />,
          },
          { path: "awards", element: <Catalog key="awards" kind="awards" /> },
        ],
      },
      { path: "/settings/about", element: <Navigate to="/about" replace /> },
      { path: "/settings/:section?", element: <Settings /> },
      { path: "/about", element: <AboutPage /> },
      { path: "*", element: <Navigate to="/live" replace /> },
    ],
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Admin root is missing");
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <LocaleProvider>
        <RuntimeProvider>
          <SaveStatusProvider>
            <NavigationProvider>
              <LeaderboardProvider>
                <MessagesProvider>
                  <Suspense fallback={<p role="status">CommRelay…</p>}>
                    <RouterProvider router={router} />
                  </Suspense>
                </MessagesProvider>
              </LeaderboardProvider>
            </NavigationProvider>
          </SaveStatusProvider>
        </RuntimeProvider>
      </LocaleProvider>
    </ErrorBoundary>
  </StrictMode>,
);
