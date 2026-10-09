import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Search, User, UsersRound, X } from "lucide-react";

import { fetchCaseAgents, type Specialist } from "../api/case-agents";
import { runSpecialist } from "../api/run-specialist";
import { fetchSpecialistConversations } from "../api/specialist-conversations";
import type { ConversationEntry } from "../api/types";
import { CHAT_RESPONSE_EVENT, parseChatResponseEvent, type ChatAnswer } from "../lib/chat-response";
import { ChatSkeleton } from "./AnalysisLoaders";
import { ChatResponseCard } from "./ChatResponseCard";
import { ConversationList } from "./ConversationList";
import { useSocket } from "./SocketProvider";
import { useLanguage } from "../context/LanguageContext";
import { TranslatableText } from "./TranslatableText";
import { generateUUID } from "../lib/utils";

type LocalTurn = {
  id: string;
  agentId: string;
  query: string;
  answer: ChatAnswer | null;
  status: "pending" | "complete" | "failed";
  error?: string | undefined;
};

function statusStyle(status: string | null): string {
  if (status?.toLowerCase() === "active") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status?.toLowerCase() === "default") return "bg-sky-50 text-sky-700 ring-sky-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function SpecialistsView({ refreshKey }: { refreshKey: number }) {
  const { t } = useLanguage();
  const [specialists, setSpecialists] = useState<Array<Specialist>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [conversationEntries, setConversationEntries] = useState<Array<ConversationEntry>>([]);
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [conversationReloadKey, setConversationReloadKey] = useState(0);
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [localTurns, setLocalTurns] = useState<Array<LocalTurn>>([]);
  const localTurnsRef = useRef(localTurns);
  localTurnsRef.current = localTurns;
  const timeoutIdsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const { on: onSocketEvent } = useSocket();
  const draft = selectedId === null ? "" : (drafts[selectedId] ?? "");
  const visibleTurns = localTurns.filter((turn) => turn.agentId === selectedId);
  const isReplyPending = visibleTurns.some((turn) => turn.status === "pending");

  const updateDraft = (value: string) => {
    if (selectedId === null) return;
    setDrafts((previous) => ({ ...previous, [selectedId]: value }));
  };

  useEffect(() => {
    return onSocketEvent(CHAT_RESPONSE_EVENT, (raw) => {
      const reply = parseChatResponseEvent(raw);
      if (reply === null) return;
      const waiting =
        localTurnsRef.current.find(
          (turn) => turn.agentId === reply.sessionId && turn.status === "pending",
        ) ??
        localTurnsRef.current.find(
          (turn) => turn.agentId === reply.sessionId && turn.status === "failed",
        );
      if (waiting === undefined) return;
      const timeout = timeoutIdsRef.current.get(waiting.id);
      if (timeout !== undefined) clearTimeout(timeout);
      timeoutIdsRef.current.delete(waiting.id);
      setLocalTurns((previous) =>
        previous.map((turn) =>
          turn.id === waiting.id
            ? { ...turn, answer: reply, status: "complete" as const, error: undefined }
            : turn,
        ),
      );
    });
  }, [onSocketEvent]);

  useEffect(() => {
    const timeouts = timeoutIdsRef.current;
    return () => {
      for (const timeout of timeouts.values()) clearTimeout(timeout);
      timeouts.clear();
    };
  }, []);

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const agentId = selectedId;
    const query = draft.trim();
    if (agentId === null || query === "" || isReplyPending) return;

    const id = generateUUID();
    setLocalTurns((previous) => [
      ...previous.filter(
        (turn) => !(turn.agentId === agentId && turn.query === query && turn.status === "failed"),
      ),
      { id, agentId, query, answer: null, status: "pending" },
    ]);

    void runSpecialist({ data: { agentId, prompt: query } })
      .then(() => {
        setDrafts((previous) =>
          previous[agentId] === query ? { ...previous, [agentId]: "" } : previous,
        );
        const timeout = setTimeout(() => {
          setLocalTurns((previous) =>
            previous.map((turn) =>
              turn.id === id && turn.status === "pending"
                ? {
                    ...turn,
                    status: "failed" as const,
                    error: "No reply has arrived yet. Try refreshing this specialist.",
                  }
                : turn,
            ),
          );
          timeoutIdsRef.current.delete(id);
        }, 120_000);
        timeoutIdsRef.current.set(id, timeout);
      })
      .catch((reason: unknown) => {
        const denied = reason instanceof Error && /forbidden|access/i.test(reason.message);
        setLocalTurns((previous) =>
          previous.map((turn) =>
            turn.id === id && turn.status === "pending"
              ? {
                  ...turn,
                  status: "failed" as const,
                  error: denied
                    ? "You do not have access to run this specialist."
                    : "Could not send this message. Please try again.",
                }
              : turn,
          ),
        );
      });
  };

  useEffect(() => {
    let current = true;
    setIsLoading(true);
    setError(null);

    void fetchCaseAgents()
      .then((items) => {
        if (!current) return;
        setSpecialists(items);
        setSelectedId((previous) =>
          items.some((item) => item.id === previous) ? previous : (items[0]?.id ?? null),
        );
      })
      .catch((reason: unknown) => {
        if (!current) return;
        console.error("[specialists] could not load catalog", reason);
        setError("Could not load specialists. Please try again.");
      })
      .finally(() => {
        if (current) setIsLoading(false);
      });

    return () => {
      current = false;
    };
  }, [refreshKey, reloadKey]);

  useEffect(() => {
    if (selectedId === null) return;
    let current = true;
    setIsConversationsLoading(true);
    setConversationsError(null);
    setConversationEntries([]);

    void fetchSpecialistConversations({ data: { agentId: selectedId } })
      .then((items) => {
        if (!current) return;
        setConversationEntries(items);
      })
      .catch((reason: unknown) => {
        if (!current) return;
        console.error("[specialists] could not load conversations", reason);
        setConversationsError("Could not load this specialist's conversations.");
      })
      .finally(() => {
        if (current) setIsConversationsLoading(false);
      });

    return () => {
      current = false;
    };
  }, [selectedId, refreshKey, reloadKey, conversationReloadKey]);

  useEffect(() => {
    const pane = conversationScrollRef.current;
    if (pane !== null) pane.scrollTop = pane.scrollHeight;
  }, [conversationEntries, isConversationsLoading, localTurns, selectedId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === "") return specialists;
    return specialists.filter((item) =>
      [item.title, item.role, item.description, item.status]
        .filter((value): value is string => value !== null)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [specialists, search]);

  return (
    <div className="flex min-h-0 flex-1 bg-[#eaf5f8]">
      <aside
        className={`flex w-full shrink-0 flex-col border-r border-slate-200 bg-white lg:w-[370px] ${isDetailOpen ? "hidden lg:flex" : "flex"}`}
      >
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-[#0e7490]">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{t("specialists.title", { defaultValue: "Specialists" })}</h1>
                <p className="text-xs text-slate-500">
                  {isLoading ? t("specialists.loading", { defaultValue: "Loading specialists" }) : `${specialists.length} ${t("specialists.available", { defaultValue: "available" })}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              aria-label={t("specialists.refresh", { defaultValue: "Refresh specialists" })}
              title={t("specialists.refresh", { defaultValue: "Refresh specialists" })}
              className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#0e7490]"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("specialists.searchPlaceholder", { defaultValue: "Search specialists" })}
              aria-label={t("specialists.searchPlaceholder", { defaultValue: "Search specialists" })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0e7490] focus:ring-2 focus:ring-[#0e7490]/15"
            />
          </div>
        </div>

        <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div role="status" className="space-y-2" aria-label={t("specialists.loading", { defaultValue: "Loading specialists" })}>
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error !== null ? (
            <div className="px-3 py-8 text-center text-sm text-slate-600">
              <p>{t("specialists.loadError", { defaultValue: "Could not load specialists. Please try again." })}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-3 font-semibold text-[#0e7490] hover:underline"
              >
                {t("specialists.tryAgain", { defaultValue: "Try again" })}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              {specialists.length === 0
                ? t("specialists.noSpecialists", { defaultValue: "No specialists are available yet." })
                : t("specialists.noMatch", { defaultValue: "No specialists match your search." })}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (selectedId === item.id) {
                      setConversationReloadKey((value) => value + 1);
                    } else {
                      setSelectedId(item.id);
                    }
                    setIsDetailOpen(true);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedId === item.id
                      ? "border-cyan-400 bg-cyan-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-900"><TranslatableText text={item.title} /></h2>
                    {item.status !== null && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusStyle(item.status)}`}
                      >
                        <TranslatableText text={item.status} />
                      </span>
                    )}
                  </div>
                  {item.role !== null && (
                    <p className="mt-1 text-xs font-medium text-[#0e7490]"><TranslatableText text={item.role} /></p>
                  )}
                  {item.description !== null && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                      <TranslatableText text={item.description} />
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section
        className={`min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-[#eaf5f8] via-[#e4f1f5] to-[#def0f5] ${isDetailOpen ? "flex" : "hidden lg:flex"}`}
      >
        {selectedId === null ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
            {t("specialists.selectSpecialist", { defaultValue: "Select a specialist to see its conversation." })}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
              className="mx-4 mt-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-[#0e7490] lg:hidden"
            >
              <ArrowLeft className="size-4" /> {t("specialists.backToSpecialists", { defaultValue: "Back to specialists" })}
            </button>
            <div
              ref={conversationScrollRef}
              className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-14 pb-6 sm:px-6 sm:pt-16"
            >
              <div className="mx-auto max-w-[58rem]">
                {conversationsError !== null ? (
                  <div className="py-10 text-center text-sm text-slate-600">
                    <p>{t("specialists.conversationsError", { defaultValue: "Could not load this specialist's conversations." })}</p>
                    <button
                      type="button"
                      onClick={() => setConversationReloadKey((value) => value + 1)}
                      className="mt-3 font-semibold text-[#0e7490] hover:underline"
                    >
                      {t("specialists.tryAgain", { defaultValue: "Try again" })}
                    </button>
                  </div>
                ) : isConversationsLoading ? (
                  <ConversationList entries={[]} isLoading />
                ) : conversationEntries.length === 0 && visibleTurns.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-600">
                    {t("specialists.noMessages", { defaultValue: "No messages were returned for this specialist." })}
                  </p>
                ) : (
                  <div className="space-y-6">
                    {conversationEntries.length > 0 && (
                      <ConversationList entries={conversationEntries} isLoading={false} />
                    )}
                    {visibleTurns.map((turn) => (
                      <div key={turn.id} className="space-y-4">
                        <div className="flex justify-end">
                          <div className="flex max-w-xl items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-2xs">
                            <span><TranslatableText text={turn.query} /></span>
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                              <User className="size-3.5" aria-hidden="true" />
                            </span>
                          </div>
                        </div>
                        {turn.status === "pending" && <ChatSkeleton />}
                        {turn.answer !== null && <ChatResponseCard answer={turn.answer} />}
                        {turn.status === "failed" && (
                          <p role="alert" className="text-right text-sm text-red-700">
                            {turn.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="pointer-events-none shrink-0 bg-gradient-to-t from-[#def0f5] via-[#def0f5]/90 to-transparent px-4 pt-8 pb-4 sm:px-6">
              <form
                onFocus={() => setIsComposerFocused(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setIsComposerFocused(false);
                  }
                }}
                onSubmit={sendMessage}
                className={`pointer-events-auto mx-auto flex items-center gap-3 rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 shadow-md transition-all hover:border-slate-400 hover:shadow-lg focus-within:border-[#0e7490] focus-within:ring-4 focus-within:ring-[#0e7490]/20 sm:rounded-full sm:px-5 ${isComposerFocused || draft.trim() ? "max-w-3xl" : "max-w-2xl"}`}
              >
                <Search
                  className="size-5 shrink-0 text-[#0e7490] stroke-[2.2]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => updateDraft(event.target.value)}
                  placeholder={t("specialists.askPlaceholder", { defaultValue: "Ask this specialist a question..." })}
                  aria-label={t("specialists.askPlaceholder", { defaultValue: "Ask this specialist a question..." })}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
                />
                {draft !== "" && (
                  <button
                    type="button"
                    onClick={() => updateDraft("")}
                    aria-label={t("specialists.clearMessage", { defaultValue: "Clear message" })}
                    className="rounded-full p-1 text-slate-400 transition hover:text-slate-700"
                  >
                    <X className="size-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={draft.trim() === "" || isReplyPending}
                  className="shrink-0 rounded-xl bg-[#0e7490] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0c627a] disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-full sm:px-5 sm:text-sm"
                >
                  {t("specialists.analyze", { defaultValue: "Analyze" })}
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
