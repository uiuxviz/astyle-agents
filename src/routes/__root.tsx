import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  redirect,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { establishSession } from "../api/auth";
import { fetchInitialData } from "../api/initial-data";
import { InvalidConfiguration } from "../components/InvalidConfiguration";
import { SocketProvider } from "../components/SocketProvider";
import { TOKEN_SEARCH_PARAM } from "../config";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { toHistorySessions } from "../lib/sessions";
import { LanguageProvider, useLanguage } from "../context/LanguageContext";

function NotFoundComponent() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">
          {t("notFound.title", { defaultValue: "404" })}
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {t("notFound.subtitle", { defaultValue: "Page not found" })}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("notFound.description", {
            defaultValue: "The page you're looking for doesn't exist or has been moved.",
          })}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.goHome", { defaultValue: "Go home" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useLanguage();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errorPage.title", { defaultValue: "This page didn't load" })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("errorPage.description", {
            defaultValue:
              "Something went wrong on our end. You can try refreshing or head back home.",
          })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("errorPage.tryAgain", { defaultValue: "Try again" })}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("errorPage.goHome", { defaultValue: "Go home" })}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // The token may arrive on any route, not just "/", so it is parsed here.
  validateSearch: (search: Record<string, unknown>): { token?: string } => {
    const raw = search[TOKEN_SEARCH_PARAM];
    const token = typeof raw === "string" ? raw.trim() : "";
    return token === "" ? {} : { token };
  },
  // Gates every route: validates the token, seals the session, and loads the
  // bootstrap data the sidebar renders on whichever page the user landed on.
  beforeLoad: async ({ search, location }) => {
    const auth = await establishSession({
      data: { token: search.token ?? "" },
    });

    // Once the token is sealed into the cookie the URL copy is redundant, and a
    // credential in the address bar leaks into history, bookmarks and Referer
    // headers. Drop it while staying on the current page. A rejected token is
    // left in place so the error page can stay specific.
    if (search.token !== undefined && auth.status === "authenticated") {
      throw redirect({ href: location.pathname, replace: true });
    }

    if (auth.status !== "authenticated") {
      return { auth, sessions: [] };
    }

    // Fail soft: a bootstrap hiccup shouldn't lock the user out of an app they
    // are authenticated for — the sidebar just starts empty.
    const sessions = await fetchInitialData().catch((error: unknown) => {
      console.error("[initial-data] failed to load session history", error);
      return [];
    });

    return { auth, sessions: toHistorySessions(sessions) };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ASTYLE" },
      {
        name: "description",
        content: "ASTYLE — Intelligent Garment & Merchandising Assistant",
      },
      { name: "author", content: "ASTYLE" },
      { property: "og:title", content: "ASTYLE" },
      {
        property: "og:description",
        content: "Lovable Generated Project",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@400..600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {/* Provided in the shell, not RootComponent: the root error and
            not-found components replace RootComponent and use translations. */}
        <LanguageProvider>{children}</LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, auth } = Route.useRouteContext();
  const router = useRouter();

  // Development-only: the report preview harness renders a fixture and talks to
  // nothing, so it does not need a session. Guarded on DEV so the token gate is
  // never weakened in a production build.
  const isDevPreview =
    import.meta.env.DEV && router.state.location.pathname.startsWith("/report-preview");

  return (
    <QueryClientProvider client={queryClient}>
      {isDevPreview ? (
        /* No SocketProvider: there is no session to open a socket with. */
        <Outlet />
      ) : auth.status === "invalid" ? (
        <InvalidConfiguration reason={auth.reason} />
      ) : (
        <SocketProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </SocketProvider>
      )}
    </QueryClientProvider>
  );
}
