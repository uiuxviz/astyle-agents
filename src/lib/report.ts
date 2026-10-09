/**
 * Parsing for the generated-report socket event.
 *
 * Same envelope as `report_gen_plan` — the report arrives as a JSON *string*
 * in `response`, so it needs two parses — but the body is the block structure
 * described by `docs/report-template.json`.
 *
 * Nothing here trusts its input. A malformed block is dropped rather than
 * thrown over, because one bad chart should not cost the reader the other
 * eleven.
 */

/** Socket event carrying a finished report. */
export const REPORT_EVENT = "report";

export type Tone = "critical" | "warning" | "info" | "good" | "neutral";

export type SeriesSpec = { key: string; label: string; emphasis: "primary" | "secondary" };
export type TrendData = {
  xKey: string;
  series: Array<SeriesSpec>;
  rows: Array<Record<string, unknown>>;
  threshold?: { value: number; label: string };
};
export type Slice = { name: string; value: number; share?: number; highlight?: string };

/**
 * A point on a forecast. `actual` is history and `forecast` is projection;
 * a row carries one or the other, never both, so the two can never be drawn
 * as the same thing. `lower`/`upper` bound the projection.
 */
export type ForecastRow = {
  actual?: number;
  forecast?: number;
  lower?: number;
  upper?: number;
  [key: string]: unknown;
};

export type ForecastTrendData = {
  xKey: string;
  rows: Array<ForecastRow>;
  /** x-value of the last observed point: everything after it is projection. */
  actualsThrough?: string;
  horizonLabel?: string;
  valueLabel?: string;
  threshold?: { value: number; label: string };
};

export type ScenarioCompareData = {
  measures: Array<{ key: string; label: string }>;
  scenarios: Array<{
    name: string;
    probability?: string;
    assumption?: string;
    likeliest?: boolean;
    values: Record<string, string>;
  }>;
};

export type VarianceBridgeData = {
  startLabel: string;
  startValue: number;
  startFormatted?: string;
  steps: Array<{ label: string; value: number; formattedValue?: string }>;
  endLabel: string;
  endValue: number;
  endFormatted?: string;
};

export type PaceStatus = "onTrack" | "atRisk" | "offTrack";

export type PaceTrackerData = {
  label: string;
  periodLabel?: string;
  /** How far through the period we are, 0-100. */
  elapsedShare: number;
  actualToDate: number;
  actualFormatted?: string;
  target: number;
  targetFormatted?: string;
  projectedLanding: number;
  projectedFormatted?: string;
  statusTone?: PaceStatus;
};

/** Provenance for a forecast. A projection without this is an opinion. */
export type ForecastMeta = {
  asOf?: string;
  horizon?: string;
  method?: string;
  confidence?: "high" | "medium" | "low";
  confidenceRationale?: string;
  keyAssumptions: Array<string>;
};

export type ReportBlock = {
  id: string;
  title: string;
  eyebrow?: string;
  insight?: string;
  agentId?: string;
  dataSources?: Array<string>;
} & (
  | { component: "narrative"; data: { paragraphs: Array<string> } }
  | {
      component: "kpiRibbon";
      data: {
        cards: Array<{
          label: string;
          value: string;
          delta?: string;
          deltaDirection?: "up" | "down" | "flat";
          /** What the change means. The app picks the colour from it. */
          deltaTone?: Tone;
        }>;
      };
    }
  | {
      component: "reportBar";
      data: {
        valueLabel?: string;
        bars: Array<{ label: string; subtext?: string; value: number; formattedValue: string }>;
      };
    }
  | { component: "groupedBar"; data: Omit<TrendData, "threshold"> }
  | {
      component: "donut";
      data: {
        centerMetric?: { label: string; value: string; caption?: string };
        slices: Array<Slice>;
      };
    }
  | { component: "pie"; data: { slices: Array<Slice> } }
  | { component: "lineTrend"; data: TrendData }
  | { component: "areaTrend"; data: TrendData }
  | {
      component: "radar";
      data: {
        overallScore?: number;
        scoreOutOf?: number;
        axes: Array<{ subject: string; score: number; fullMark: number }>;
      };
    }
  | {
      component: "table";
      data: {
        columns: Array<{
          key: string;
          label: string;
          align?: "left" | "right";
          emphasis?: boolean;
        }>;
        rows: Array<Record<string, unknown>>;
      };
    }
  | { component: "callout"; data: { tone: Tone; heading: string; body: string } }
  | {
      component: "insightList";
      data: { items: Array<{ label?: string; text: string; tone?: Tone }> };
    }
  | { component: "forecastTrend"; data: ForecastTrendData }
  | { component: "scenarioCompare"; data: ScenarioCompareData }
  | { component: "varianceBridge"; data: VarianceBridgeData }
  | { component: "paceTracker"; data: PaceTrackerData }
);

export type Report = {
  sessionId: string;
  conversationId?: string;
  reportTitle: string;
  executiveSummary?: { headline: string; narrative: string; keyFindings: Array<string> };
  howDataFound?: {
    summary: string;
    steps: Array<{ title: string; detail: string; sources: Array<string> }>;
  };
  forecastMeta?: ForecastMeta;
  blocks: Array<ReportBlock>;
  recommendations: Array<{
    title: string;
    detail: string;
    priority: "high" | "medium" | "low";
    owner?: string;
  }>;
  appendix?: { assumptions: Array<string>; dataGaps: Array<string> };
  status: "ready" | "partial" | "error";
  error?: string;
};

// ---------------------------------------------------------------- primitives

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // The platform stringifies numbers in places; accept a clean numeric string.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function strList(value: unknown): Array<string> {
  if (!Array.isArray(value)) return [];
  return value.map(str).filter((item): item is string => item !== undefined);
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

const TONES: ReadonlyArray<Tone> = ["critical", "warning", "info", "good", "neutral"];

function tone(value: unknown): Tone | undefined {
  const raw = str(value)?.toLowerCase();
  return TONES.find((t) => t === raw);
}

const DIRECTIONS = ["up", "down", "flat"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;
const PACE_STATUSES: ReadonlyArray<PaceStatus> = ["onTrack", "atRisk", "offTrack"];

const CONFIDENCES = ["high", "medium", "low"] as const;

function confidence(value: unknown): (typeof CONFIDENCES)[number] | undefined {
  const raw = str(value)?.toLowerCase();
  return CONFIDENCES.find((level) => level === raw);
}

function paceStatus(value: unknown): PaceStatus | undefined {
  const raw = str(value)?.toLowerCase();
  return PACE_STATUSES.find((status) => status.toLowerCase() === raw);
}

/** A number sent where a display string was expected, rendered rather than dropped. */
function numText(value: unknown): string | undefined {
  const parsed = num(value);
  return parsed === undefined ? undefined : parsed.toLocaleString();
}

function toThreshold(value: unknown): { value: number; label: string } | undefined {
  if (!isRecord(value)) return undefined;
  const at = num(value["value"]);
  const label = str(value["label"]);
  return at === undefined || label === undefined ? undefined : { value: at, label };
}

function direction(value: unknown): (typeof DIRECTIONS)[number] | undefined {
  const raw = str(value)?.toLowerCase();
  return DIRECTIONS.find((d) => d === raw);
}

/** Unrecognised priorities land in the middle rather than at either extreme. */
function priority(value: unknown): (typeof PRIORITIES)[number] {
  const raw = str(value)?.toLowerCase();
  return PRIORITIES.find((p) => p === raw) ?? "medium";
}

/** Maps a list, dropping entries the mapper rejects. */
function mapList<T>(
  value: unknown,
  map: (raw: Record<string, unknown>, index: number) => T | null,
): Array<T> {
  return records(value)
    .map(map)
    .filter((item): item is T => item !== null);
}

/**
 * `{ key: value }` when there is a value, `{}` when there is not.
 *
 * Generic over the key so the result keeps that key's type. Returning a plain
 * `Record<string, T>` would add an index signature, which silently widens
 * every sibling field at the spread site - `priority` becomes `string`, and a
 * union stops being checked.
 */
function optional<K extends string, T>(key: K, value: T | undefined): { [P in K]?: T } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: T };
}

// -------------------------------------------------------------------- blocks

function toSeries(raw: Record<string, unknown>, index: number): SeriesSpec | null {
  const key = str(raw["key"]);
  if (key === undefined) return null;

  return {
    key,
    label: str(raw["label"]) ?? key,
    // The first series carries the chart; later ones are context unless the
    // agent says otherwise.
    emphasis: str(raw["emphasis"]) === "secondary" || index > 0 ? "secondary" : "primary",
  };
}

function toTrend(raw: unknown): TrendData | null {
  if (!isRecord(raw)) return null;

  const xKey = str(raw["xKey"]);
  const series = mapList(raw["series"], toSeries);
  const rows = records(raw["rows"]);
  if (xKey === undefined || series.length === 0 || rows.length === 0) return null;

  const thresholdRaw = raw["threshold"];
  const thresholdValue = isRecord(thresholdRaw) ? num(thresholdRaw["value"]) : undefined;
  const threshold =
    thresholdValue === undefined
      ? undefined
      : {
          value: thresholdValue,
          label: str((thresholdRaw as Record<string, unknown>)["label"]) ?? "",
        };

  return { xKey, series, rows, ...optional("threshold", threshold) };
}

function toSlices(raw: unknown): Array<Slice> {
  return mapList(raw, (item) => {
    const name = str(item["name"]);
    const value = num(item["value"]);
    if (name === undefined || value === undefined) return null;

    return {
      name,
      value,
      ...optional("share", num(item["share"])),
      ...optional("highlight", str(item["highlight"])),
    };
  });
}

/**
 * Build one block, or null when its data cannot carry the component.
 *
 * An empty chart is worse than a missing one: it reads as "we found nothing"
 * when the truth is "the payload was malformed".
 */
function toBlock(raw: unknown, index: number): ReportBlock | null {
  if (!isRecord(raw)) return null;

  const component = str(raw["component"]);
  const data = isRecord(raw["data"]) ? raw["data"] : {};
  if (component === undefined) return null;

  const meta = {
    id: str(raw["id"]) ?? `block-${index}`,
    title: str(raw["title"]) ?? "",
    ...optional("eyebrow", str(raw["eyebrow"])),
    ...optional("insight", str(raw["insight"])),
    ...optional("agentId", str(raw["agentId"])),
    ...(strList(raw["dataSources"]).length > 0 ? { dataSources: strList(raw["dataSources"]) } : {}),
  };

  switch (component) {
    case "narrative": {
      const paragraphs = strList(data["paragraphs"]);
      return paragraphs.length === 0 ? null : { ...meta, component, data: { paragraphs } };
    }

    case "kpiRibbon": {
      const cards = mapList(data["cards"], (card) => {
        const label = str(card["label"]);
        const value = str(card["value"]);
        if (label === undefined || value === undefined) return null;

        // `sparkline.tone` is where this lived before the sparkline was
        // dropped; still read so reports already in flight keep their colour.
        const legacySpark = card["sparkline"];
        const deltaTone =
          tone(card["deltaTone"]) ??
          (isRecord(legacySpark) ? tone(legacySpark["tone"]) : undefined);

        return {
          label,
          value,
          ...optional("delta", str(card["delta"])),
          ...optional("deltaDirection", direction(card["deltaDirection"])),
          ...optional("deltaTone", deltaTone),
        };
      });
      return cards.length === 0 ? null : { ...meta, component, data: { cards } };
    }

    case "reportBar": {
      const bars = mapList(data["bars"], (bar) => {
        const label = str(bar["label"]);
        const value = num(bar["value"]);
        if (label === undefined || value === undefined) return null;

        return {
          label,
          value,
          // Falls back to the raw number rather than inventing a format.
          formattedValue: str(bar["formattedValue"]) ?? String(value),
          ...optional("subtext", str(bar["subtext"])),
        };
      });
      return bars.length === 0
        ? null
        : {
            ...meta,
            component,
            data: { bars, ...optional("valueLabel", str(data["valueLabel"])) },
          };
    }

    case "groupedBar": {
      const trend = toTrend(data);
      if (trend === null) return null;
      const { xKey, series, rows } = trend;
      return { ...meta, component, data: { xKey, series, rows } };
    }

    case "donut": {
      const slices = toSlices(data["slices"]);
      if (slices.length === 0) return null;

      const centerRaw = data["centerMetric"];
      const centerLabel = isRecord(centerRaw) ? str(centerRaw["label"]) : undefined;
      const centerValue = isRecord(centerRaw) ? str(centerRaw["value"]) : undefined;
      const centerMetric =
        centerLabel !== undefined && centerValue !== undefined
          ? {
              label: centerLabel,
              value: centerValue,
              ...optional("caption", str((centerRaw as Record<string, unknown>)["caption"])),
            }
          : undefined;

      return { ...meta, component, data: { slices, ...optional("centerMetric", centerMetric) } };
    }

    case "pie": {
      const slices = toSlices(data["slices"]);
      return slices.length === 0 ? null : { ...meta, component, data: { slices } };
    }

    case "lineTrend":
    case "areaTrend": {
      const trend = toTrend(data);
      return trend === null ? null : { ...meta, component, data: trend };
    }

    case "radar": {
      const axes = mapList(data["axes"], (axis) => {
        const subject = str(axis["subject"]);
        const score = num(axis["score"]);
        if (subject === undefined || score === undefined) return null;
        return { subject, score, fullMark: num(axis["fullMark"]) ?? 100 };
      });
      return axes.length < 3
        ? null
        : {
            ...meta,
            component,
            data: {
              axes,
              ...optional("overallScore", num(data["overallScore"])),
              ...optional("scoreOutOf", num(data["scoreOutOf"])),
            },
          };
    }

    case "table": {
      const columns = mapList(data["columns"], (column) => {
        const key = str(column["key"]);
        if (key === undefined) return null;
        return {
          key,
          label: str(column["label"]) ?? key,
          ...(str(column["align"]) === "right" ? { align: "right" as const } : {}),
          ...(column["emphasis"] === true ? { emphasis: true } : {}),
        };
      });
      const rows = records(data["rows"]);
      return columns.length === 0 || rows.length === 0
        ? null
        : { ...meta, component, data: { columns, rows } };
    }

    case "callout": {
      const heading = str(data["heading"]);
      const body = str(data["body"]);
      if (heading === undefined || body === undefined) return null;
      return { ...meta, component, data: { tone: tone(data["tone"]) ?? "info", heading, body } };
    }

    case "insightList": {
      const items = mapList(data["items"], (item) => {
        const text = str(item["text"]);
        if (text === undefined) return null;
        return {
          text,
          ...optional("label", str(item["label"])),
          ...optional("tone", tone(item["tone"])),
        };
      });
      return items.length === 0 ? null : { ...meta, component, data: { items } };
    }

    case "forecastTrend": {
      const xKey = str(data["xKey"]);
      if (xKey === undefined) return null;
      const rows = records(data["rows"]).map((row) => {
        const point: ForecastRow = { ...row };
        for (const key of ["actual", "forecast", "lower", "upper"] as const) {
          const value = num(row[key]);
          if (value === undefined) delete point[key];
          else point[key] = value;
        }
        return point;
      });
      // Without a projected point this is just a line chart, and calling it a
      // forecast would overstate what the agent actually sent.
      if (!rows.some((row) => row.forecast !== undefined)) return null;
      return {
        ...meta,
        component,
        data: {
          xKey,
          rows,
          ...optional("actualsThrough", str(data["actualsThrough"])),
          ...optional("horizonLabel", str(data["horizonLabel"])),
          ...optional("valueLabel", str(data["valueLabel"])),
          ...optional("threshold", toThreshold(data["threshold"])),
        },
      };
    }

    case "scenarioCompare": {
      const measures = mapList(data["measures"], (item) => {
        const key = str(item["key"]);
        const label = str(item["label"]);
        return key === undefined || label === undefined ? null : { key, label };
      });
      const scenarios = mapList(data["scenarios"], (item) => {
        const name = str(item["name"]);
        if (name === undefined) return null;
        const rawValues = isRecord(item["values"]) ? item["values"] : {};
        const values: Record<string, string> = {};
        for (const measure of measures) {
          const value = str(rawValues[measure.key]) ?? numText(rawValues[measure.key]);
          if (value !== undefined) values[measure.key] = value;
        }
        return {
          name,
          values,
          ...optional("probability", str(item["probability"])),
          ...optional("assumption", str(item["assumption"])),
          ...(item["likeliest"] === true ? { likeliest: true } : {}),
        };
      });
      return measures.length === 0 || scenarios.length === 0
        ? null
        : { ...meta, component, data: { measures, scenarios } };
    }

    case "varianceBridge": {
      const startValue = num(data["startValue"]);
      const endValue = num(data["endValue"]);
      if (startValue === undefined || endValue === undefined) return null;
      const steps = mapList(data["steps"], (item) => {
        const label = str(item["label"]);
        const value = num(item["value"]);
        return label === undefined || value === undefined
          ? null
          : { label, value, ...optional("formattedValue", str(item["formattedValue"])) };
      });
      return steps.length === 0
        ? null
        : {
            ...meta,
            component,
            data: {
              startLabel: str(data["startLabel"]) ?? "Plan",
              startValue,
              endLabel: str(data["endLabel"]) ?? "Actual",
              endValue,
              steps,
              ...optional("startFormatted", str(data["startFormatted"])),
              ...optional("endFormatted", str(data["endFormatted"])),
            },
          };
    }

    case "paceTracker": {
      const label = str(data["label"]);
      const actualToDate = num(data["actualToDate"]);
      const target = num(data["target"]);
      const projectedLanding = num(data["projectedLanding"]);
      if (
        label === undefined ||
        actualToDate === undefined ||
        target === undefined ||
        projectedLanding === undefined
      ) {
        return null;
      }
      const elapsed = num(data["elapsedShare"]) ?? 0;
      return {
        ...meta,
        component,
        data: {
          label,
          actualToDate,
          target,
          projectedLanding,
          elapsedShare: Math.min(100, Math.max(0, elapsed)),
          ...optional("periodLabel", str(data["periodLabel"])),
          ...optional("actualFormatted", str(data["actualFormatted"])),
          ...optional("targetFormatted", str(data["targetFormatted"])),
          ...optional("projectedFormatted", str(data["projectedFormatted"])),
          ...optional("statusTone", paceStatus(data["statusTone"])),
        },
      };
    }

    default:
      // A component this build cannot draw. Dropping it is honest; rendering a
      // placeholder would imply the report is complete.
      console.warn("[report] unknown component, block dropped", { component, id: meta.id });
      return null;
  }
}

// -------------------------------------------------------------------- report

function toStatus(value: unknown): Report["status"] {
  const raw = str(value)?.toLowerCase();
  return raw === "error" || raw === "partial" ? raw : "ready";
}

/**
 * Map an already-parsed report body onto `Report`.
 *
 * Shared by the socket path and by stored conversations, the same way
 * `toReportPlan` is.
 */
export function toReport(
  body: unknown,
  fallbackSessionId?: string,
  conversationId?: string,
): Report | null {
  const raw = isRecord(body) ? body : {};
  const sessionId = str(raw["sessionId"]) ?? fallbackSessionId;
  if (sessionId === undefined) return null;

  const blocks = Array.isArray(raw["blocks"])
    ? raw["blocks"]
        .map((block, index) => toBlock(block, index))
        .filter((block): block is ReportBlock => block !== null)
    : [];

  const summaryRaw = raw["executiveSummary"];
  const headline = isRecord(summaryRaw) ? str(summaryRaw["headline"]) : undefined;
  const executiveSummary =
    headline === undefined
      ? undefined
      : {
          headline,
          narrative: str((summaryRaw as Record<string, unknown>)["narrative"]) ?? "",
          keyFindings: strList((summaryRaw as Record<string, unknown>)["keyFindings"]),
        };

  const recommendations = mapList(raw["recommendations"], (item) => {
    const title = str(item["title"]);
    if (title === undefined) return null;

    return {
      title,
      detail: str(item["detail"]) ?? "",
      priority: priority(item["priority"]),
      ...optional("owner", str(item["owner"])),
    };
  });

  const methodRaw = raw["howDataFound"];
  const methodSummary = isRecord(methodRaw) ? str(methodRaw["summary"]) : undefined;
  const methodSteps = isRecord(methodRaw)
    ? mapList(methodRaw["steps"], (step) => {
        const title = str(step["title"]);
        const detail = str(step["detail"]);
        if (title === undefined || detail === undefined) return null;
        return { title, detail, sources: strList(step["sources"]) };
      })
    : [];
  const howDataFound =
    methodSummary !== undefined && methodSteps.length > 0
      ? { summary: methodSummary, steps: methodSteps }
      : undefined;

  const forecastRaw = raw["forecastMeta"];
  const forecastMeta = isRecord(forecastRaw)
    ? {
        keyAssumptions: strList(forecastRaw["keyAssumptions"]),
        ...optional("asOf", str(forecastRaw["asOf"])),
        ...optional("horizon", str(forecastRaw["horizon"])),
        ...optional("method", str(forecastRaw["method"])),
        ...optional("confidence", confidence(forecastRaw["confidence"])),
        ...optional("confidenceRationale", str(forecastRaw["confidenceRationale"])),
      }
    : undefined;

  const appendixRaw = raw["appendix"];
  const assumptions = isRecord(appendixRaw) ? strList(appendixRaw["assumptions"]) : [];
  const dataGaps = isRecord(appendixRaw) ? strList(appendixRaw["dataGaps"]) : [];

  return {
    sessionId,
    ...optional("conversationId", conversationId ?? str(raw["conversationId"])),
    reportTitle: str(raw["reportTitle"]) ?? "Report",
    ...optional("executiveSummary", executiveSummary),
    ...optional("howDataFound", howDataFound),
    ...optional("forecastMeta", forecastMeta),
    blocks,
    recommendations,
    ...(assumptions.length > 0 || dataGaps.length > 0
      ? { appendix: { assumptions, dataGaps } }
      : {}),
    status: toStatus(raw["status"]),
    ...optional("error", str(raw["error"])),
  };
}

/**
 * Pull the report out of a socket event.
 *
 * Returns null when the payload carries no session id — without one there is
 * no run to attach it to, so acting on it would be a guess.
 */
export function parseReportEvent(rawEvent: unknown): Report | null {
  if (!isRecord(rawEvent)) return null;

  // The two events disagree on casing: the plan sends `Session_ID`, the report
  // sends `session_id`. Both are accepted, with `jobId` as the last resort.
  const envelopeSessionId =
    str(rawEvent["session_id"]) ?? str(rawEvent["Session_ID"]) ?? str(rawEvent["jobId"]);
  // The report carries its conversation id in the body rather than the
  // envelope; `toReport` falls back to it.
  const conversationId = str(rawEvent["conversation_id"]);

  let body: unknown = rawEvent["response"];
  if (typeof body === "string") {
    const rawJson = body;
    body = parseReportJsonText(rawJson);
    if (body === undefined) {
      console.error("[report] could not parse response", {
        sessionId: envelopeSessionId,
        length: rawJson.length,
        tail: rawJson.slice(-80),
      });

      return envelopeSessionId === undefined
        ? null
        : {
            sessionId: envelopeSessionId,
            ...optional("conversationId", conversationId),
            reportTitle: "Report",
            blocks: [],
            recommendations: [],
            status: "error",
            error:
              "The report arrived malformed and could not be read. This is a transport problem, not a result.",
          };
    }
  }

  return toReport(body, envelopeSessionId, conversationId);
}

/**
 * Resiliently parse report JSON that may arrive wrapped in markdown fences,
 * with conversational preambles/postambles, or double-encoded.
 */
function parseReportJsonText(value: string): unknown {
  const source = value.trim();
  const candidates: string[] = [source];

  // 1. Markdown code fence stripping
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(source);
  if (fenced?.[1] !== undefined) candidates.push(fenced[1].trim());

  const unwrapped = unwrapJsonFence(source);
  if (unwrapped !== source) candidates.push(unwrapped);

  // 2. Extract slice between first { and last }
  const firstObject = source.indexOf("{");
  const lastObject = source.lastIndexOf("}");
  if (firstObject !== -1 && lastObject > firstObject) {
    candidates.push(source.slice(firstObject, lastObject + 1));
  }

  // 3. Try standard candidates
  for (const candidate of candidates) {
    try {
      let parsed: unknown = JSON.parse(candidate);
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed.trim());
        } catch {
          // keep as parsed
        }
      }
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Try next candidate
    }
  }

  // 4. Try lenient trailing-comma cleanups before closing braces
  for (const candidate of candidates) {
    try {
      const sanitized = candidate.replace(/,\s*([}\]])/g, "$1");
      const parsed: unknown = JSON.parse(sanitized);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Continue
    }
  }

  return undefined;
}

/**
 * Agents sometimes wrap their JSON in a Markdown code fence. Return the body
 * of a fence that spans the whole text, or the text unchanged.
 */
export function unwrapJsonFence(text: string): string {
  const fenced = /^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?\s*```$/.exec(text.trim());
  return fenced === null ? text.trim() : (fenced[1] ?? "").trim();
}

/** Whether a parsed body is a report, with or without chart blocks. */
export function looksLikeReport(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value["blocks"]) ||
    value["spec"] === "astyle-report-template" ||
    (str(value["reportTitle"]) !== undefined && isRecord(value["executiveSummary"]))
  );
}

/**
 * A report sent as text — e.g. a specialist answer that is the report JSON,
 * possibly fenced. Returns null for anything that is not a report.
 */
export function reportFromText(text: string, fallbackSessionId = ""): Report | null {
  const body = unwrapJsonFence(text);
  if (!body.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(body);
    return looksLikeReport(parsed) ? toReport(parsed, fallbackSessionId) : null;
  } catch {
    return null;
  }
}
