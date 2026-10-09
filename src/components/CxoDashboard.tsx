import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  UsersRound,
  Home,
  FileText,
  Sparkles,
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Search,
  Filter,
  Check,
  Loader2,
  Languages,
  Mic,
  MessageSquare,
  History,
  X,
  TrendingDown,
  TrendingUp,
  Activity,
  DollarSign,
  Package,
  Layers,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Plus,
  ExternalLink,
  Database,
  Send,
  User,
  Table2,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Play,
} from "lucide-react";
import {
  CaseDetailsView,
  caseSummaries,
  caseSampleTelemetryData,
  caseMethodologyTexts,
  type SampleDataRecord,
  type CaseSummaryConfig,
  type CaseMethodologyText,
} from "./CaseDetailsView";
import { ReportPipelineDiagram } from "./ReportPipelineDiagram";
import { SessionHistorySidebar, type HistorySession } from "./SessionHistorySidebar";
import { AgentCreationLoader, ChatSkeleton, PlanSkeleton, ReportSkeleton } from "./AnalysisLoaders";
import { ConversationList } from "./ConversationList";
import { ChatResponseCard } from "./ChatResponseCard";
import { SpecialistsView } from "./SpecialistsView";
import { ReportPlanCard, type ContinueStage } from "./ReportPlanCard";
import { ReportView } from "./ReportView";
import { useSocket } from "./SocketProvider";
import { parseReportEvent, REPORT_EVENT, type Report } from "../lib/report";
import { CHAT_RESPONSE_EVENT, parseChatResponseEvent, type ChatAnswer } from "../lib/chat-response";
import {
  parseReportPlanEvent,
  REPORT_PLAN_EVENT,
  toReportPlan,
  type ReportPlan,
} from "../lib/report-plan";
import { startAnalysis } from "../api/analysis";
import { fetchConversations } from "../api/conversations";
import { createAgents } from "../api/agents";
import { deleteSession } from "../api/delete-session";
import { continueReport } from "../api/report";
import type { ConversationEntry } from "../api/types";
import type { AnalysisMode } from "../api/types";
import { useLanguage } from "../context/LanguageContext";
import { TranslatableText } from "./TranslatableText";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { VOICE_MODE_ENABLED } from "../config";
import { generateUUID } from "../lib/utils";

type PastTurn = {
  id: string;
  query: string;
  plan: ReportPlan | null;
  report: Report | null;
  chatAnswer: ChatAnswer | null;
  awaitingPlan: boolean;
  awaitingChat: boolean;
  awaitingReport: boolean;
  continueStage: ContinueStage;
  creatingAgentCount: number;
};

export interface ActiveCaseItem {
  age: string;
  title: string;
  body: string;
  expiryDate?: string | undefined;
  isLive?: boolean | undefined;
  agent?: string | undefined;
  newFindingsCount?: number | undefined;
}

export interface AnalyzedCaseData {
  query: string;
  matchedCaseId: string;
  caseItem: ActiveCaseItem;
  kpiAnswer: string;
  summary: CaseSummaryConfig;
  telemetry: {
    records: SampleDataRecord[];
    totalExposure: string;
    coverage: string;
  };
  timestamp: string;
}

export interface CxoProductRow {
  product: string;
  inventory: string;
  age: string;
  salesTrend: string;
}

export interface CxoDriverRow {
  label: string;
  value: string;
}

export interface CxoInsightItem {
  number: string;
  headline: string;
  detail: string;
}

export interface CxoEvidenceDataset {
  id: string;
  name: string;
  badge: string;
  period: string;
  totalSum: string;
  recordCount: string;
  sourceSystem: string;
  citationId: string;
  description: string;
  columns: string[];
  rows: Record<string, string>[];
}

export interface CxoHowAnswerFound {
  summary: string;
  analysis: string;
  findings: string[];
  evidenceDatasets: CxoEvidenceDataset[];
  dataSources?: string[];
  methodology?: string;
}

export interface CxoFindingChartBar {
  label: string;
  value: number;
  formattedValue: string;
  subtext?: string;
  color?: string;
  isWarning?: boolean;
}

export interface CxoFindingChart {
  title: string;
  subtitle: string;
  badge: string;
  type: "distribution" | "benchmark" | "comparison" | "share";
  bars: CxoFindingChartBar[];
  secondaryBreakdown?: {
    label: string;
    value: string;
    percentage: number;
    color: string;
  }[];
  benchmarkLabel?: string;
  benchmarkValue?: number;
  takeaway: string;
}

export interface CxoStructuredAnswer {
  reportTitle: string;
  reportDate: string;
  basedOnData?: string;
  kpiStats: { value: string; label: string }[];
  keyFinding: string;
  findingChart?: CxoFindingChart;
  topProducts: CxoProductRow[];
  drivers: CxoDriverRow[];
  insights: CxoInsightItem[];
  businessImpact: string;
  focusAreas: string[];
  howAnswerFound?: CxoHowAnswerFound;
}

export const cxoStructuredAnswers: Record<string, CxoStructuredAnswer> = {
  "case-1": {
    reportTitle: "Products creating the highest inventory exposure",
    reportDate: "15 May 2008",
    basedOnData: "based on the data form 19 may 08 to 21 march 24",
    kpiStats: [
      { value: "1.85 CR", label: "Inventory Exposure" },
      { value: "42", label: "Products" },
      { value: "11.5 L", label: "Top 10 Products" },
      { value: "90 Days", label: "Avg. Inventory Age" },
    ],
    keyFinding:
      "₹18.4 Cr of inventory is tied up across 42 products (1.85 CR total exposure).\nThe top 10 products account for ₹11.2 Cr (11.5 L units) of the exposure, with an average inventory age of 90 days.",
    findingChart: {
      title: "Inventory Exposure Concentration",
      subtitle: "Top products by locked capital and sales velocity decline",
      badge: "61% in Top 10",
      type: "distribution",
      bars: [
        {
          label: "Men's Denim Jacket",
          value: 2.8,
          formattedValue: "₹2.8 Cr",
          subtext: "124 days avg age · ↓ 42% sales",
          color: "bg-[#0e7490]",
        },
        {
          label: "Women's Kurti",
          value: 2.1,
          formattedValue: "₹2.1 Cr",
          subtext: "109 days avg age · ↓ 35% sales",
          color: "bg-[#0891b2]",
        },
        {
          label: "Slim Fit Shirt",
          value: 1.7,
          formattedValue: "₹1.7 Cr",
          subtext: "96 days avg age · ↓ 28% sales",
          color: "bg-[#0284c7]",
        },
        {
          label: "Casual Trousers",
          value: 1.4,
          formattedValue: "₹1.4 Cr",
          subtext: "91 days avg age · ↓ 24% sales",
          color: "bg-[#38bdf8]",
        },
        {
          label: "Printed T-shirt",
          value: 1.2,
          formattedValue: "₹1.2 Cr",
          subtext: "86 days avg age · ↓ 19% sales",
          color: "bg-[#7dd3fc]",
        },
      ],
      takeaway:
        "Top 10 items lock up ₹11.2 Cr (61%) of total exposure with an average age exceeding 87 days.",
    },
    topProducts: [
      { product: "Men's Denim Jacket", inventory: "₹2.8 Cr", age: "124 days", salesTrend: "↓ 42%" },
      { product: "Women's Kurti", inventory: "₹2.1 Cr", age: "109 days", salesTrend: "↓ 35%" },
      { product: "Slim Fit Shirt", inventory: "₹1.7 Cr", age: "96 days", salesTrend: "↓ 28%" },
      { product: "Casual Trousers", inventory: "₹1.4 Cr", age: "91 days", salesTrend: "↓ 24%" },
      { product: "Printed T-shirt", inventory: "₹1.2 Cr", age: "86 days", salesTrend: "↓ 19%" },
    ],
    drivers: [
      { label: "Slow-moving inventory", value: "₹10.5 Cr" },
      { label: "Aging inventory", value: "₹4.5 Cr" },
      { label: "Declining sales", value: "₹2.1 Cr" },
      { label: "Seasonal surplus", value: "₹0.9 Cr" },
    ],
    insights: [
      {
        number: "01",
        headline: "Exposure is concentrated",
        detail: "Top 10 products represent 61% of total exposure.",
      },
      {
        number: "02",
        headline: "Aging is increasing",
        detail: "27 products have exceeded their normal inventory age.",
      },
      {
        number: "03",
        headline: "Sales velocity is weakening",
        detail: "15 high-value products show sustained sales decline.",
      },
    ],
    businessImpact:
      "₹18.4 Cr of working capital is tied up in below-normal moving products, increasing the risk of further aging and markdown pressure.",
    focusAreas: [
      "Review top 10 high-exposure products",
      "Investigate declining sales velocity",
      "Evaluate pricing, promotions and assortment",
    ],
    howAnswerFound: {
      summary:
        "We checked stock counts and sales bills across 42 stores and warehouses, comparing how long items sit on shelves against how fast they sell.",
      analysis:
        "Analyzed 90 days of daily store billing invoices and customer return receipts across 42 retail locations and regional warehouses (Period: June 25 – September 23, 2026). We calculated total gross sales, deducted return items, and cross-referenced unit velocity against inventory age ledgers to compute net exposure sums.",
      findings: [
        "Gross Store Sales analyzed: ₹48.20 Cr across 42 locations over the 90-day period.",
        "Customer Returns & Sizing deductions: ₹0.50 Cr across 1,840 return receipts.",
        "Inventory Aging Sum: ₹18.40 Cr tied up in 42 products exceeding the 60-day turnover benchmark.",
        "Top 10 exposure products account for ₹11.20 Cr (61%) of total tied-up capital.",
      ],
      evidenceDatasets: [
        {
          id: "c1-sales-ledger",
          name: "Sales Invoices Ledger (90 Days)",
          badge: "Sales Table",
          period: "Jun 25 – Sep 23, 2026",
          totalSum: "₹48.20 Cr",
          recordCount: "24,190 Invoices",
          sourceSystem: "Store POS & ERP Invoicing Feed",
          citationId: "CIT-2026-SLS-42",
          description:
            "All store and digital invoices used to compute revenue velocity and sales run-rates.",
          columns: [
            "Invoice #",
            "Date",
            "Store / Region",
            "Product",
            "Units Sold",
            "Net Amount",
            "Sales Trend",
          ],
          rows: [
            {
              "Invoice #": "INV-2026-8841",
              Date: "23 Sep 2026",
              "Store / Region": "Delhi Flagship (DL-01)",
              Product: "Men's Denim Jacket",
              "Units Sold": "4",
              "Net Amount": "₹15,996",
              "Sales Trend": "Slow (-42%)",
            },
            {
              "Invoice #": "INV-2026-8820",
              Date: "23 Sep 2026",
              "Store / Region": "Mumbai Phoenix (MH-04)",
              Product: "Women's Kurti",
              "Units Sold": "6",
              "Net Amount": "₹11,994",
              "Sales Trend": "Slow (-35%)",
            },
            {
              "Invoice #": "INV-2026-8794",
              Date: "22 Sep 2026",
              "Store / Region": "Bengaluru Indiranagar",
              Product: "Slim Fit Shirt",
              "Units Sold": "8",
              "Net Amount": "₹15,192",
              "Sales Trend": "Sluggish (-28%)",
            },
            {
              "Invoice #": "INV-2026-8750",
              Date: "22 Sep 2026",
              "Store / Region": "Hyderabad Banjara",
              Product: "Casual Trousers",
              "Units Sold": "5",
              "Net Amount": "₹11,495",
              "Sales Trend": "Lagging (-24%)",
            },
            {
              "Invoice #": "INV-2026-8692",
              Date: "21 Sep 2026",
              "Store / Region": "Kolkata Park St",
              Product: "Printed T-shirt",
              "Units Sold": "12",
              "Net Amount": "₹11,988",
              "Sales Trend": "Lagging (-19%)",
            },
            {
              "Invoice #": "INV-2026-8610",
              Date: "20 Sep 2026",
              "Store / Region": "Pune Viman Nagar",
              Product: "Linen Casual Shirt",
              "Units Sold": "28",
              "Net Amount": "₹69,972",
              "Sales Trend": "Fast (+32%)",
            },
            {
              "Invoice #": "INV-2026-8540",
              Date: "19 Sep 2026",
              "Store / Region": "Chennai Express",
              Product: "Chino Shorts",
              "Units Sold": "18",
              "Net Amount": "₹26,982",
              "Sales Trend": "Normal (+4%)",
            },
            {
              "Invoice #": "INV-2026-8492",
              Date: "19 Sep 2026",
              "Store / Region": "Ahmedabad Alpha",
              Product: "Relaxed Utility Cargo",
              "Units Sold": "3",
              "Net Amount": "₹8,997",
              "Sales Trend": "Slow (-31%)",
            },
            {
              "Invoice #": "INV-2026-8430",
              Date: "18 Sep 2026",
              "Store / Region": "Jaipur World Trade",
              Product: "Heavyweight Wool Overcoat",
              "Units Sold": "2",
              "Net Amount": "₹15,998",
              "Sales Trend": "Stagnant (-48%)",
            },
            {
              "Invoice #": "INV-2026-8380",
              Date: "18 Sep 2026",
              "Store / Region": "Chandigarh Elante",
              Product: "Merino Knit Polo",
              "Units Sold": "7",
              "Net Amount": "₹19,593",
              "Sales Trend": "Sluggish (-16%)",
            },
            {
              "Invoice #": "INV-2026-8312",
              Date: "17 Sep 2026",
              "Store / Region": "Lucknow Phoenix",
              Product: "Vintage Straight Denim",
              "Units Sold": "14",
              "Net Amount": "₹41,986",
              "Sales Trend": "Stable (+8%)",
            },
            {
              "Invoice #": "INV-2026-8270",
              Date: "17 Sep 2026",
              "Store / Region": "Kochi Lulu Mall",
              Product: "Band-Collar Linen Shirt",
              "Units Sold": "32",
              "Net Amount": "₹79,968",
              "Sales Trend": "Surging (+88%)",
            },
            {
              "Invoice #": "INV-2026-8215",
              Date: "16 Sep 2026",
              "Store / Region": "Indore Treasure",
              Product: "Quilted Puffer Vest",
              "Units Sold": "4",
              "Net Amount": "₹11,996",
              "Sales Trend": "Lagging (-22%)",
            },
            {
              "Invoice #": "INV-2026-8170",
              Date: "16 Sep 2026",
              "Store / Region": "Surat VR Mall",
              Product: "Tailored Stretch Chino",
              "Units Sold": "19",
              "Net Amount": "₹43,681",
              "Sales Trend": "Healthy (+11%)",
            },
            {
              "Invoice #": "INV-2026-8104",
              Date: "15 Sep 2026",
              "Store / Region": "Delhi Saket (DL-02)",
              Product: "Silk Blend Resort Shirt",
              "Units Sold": "22",
              "Net Amount": "₹87,978",
              "Sales Trend": "Fast (+74%)",
            },
            {
              "Invoice #": "INV-2026-8051",
              Date: "15 Sep 2026",
              "Store / Region": "Mumbai Palladium",
              Product: "Oversized Fleece Hoodie",
              "Units Sold": "5",
              "Net Amount": "₹12,495",
              "Sales Trend": "Slow (-17%)",
            },
            {
              "Invoice #": "INV-2026-7992",
              Date: "14 Sep 2026",
              "Store / Region": "Bengaluru Koramangala",
              Product: "Ribbed Modal Tank Top",
              "Units Sold": "38",
              "Net Amount": "₹37,962",
              "Sales Trend": "Stable (+15%)",
            },
            {
              "Invoice #": "INV-2026-7935",
              Date: "14 Sep 2026",
              "Store / Region": "Noida DLF Mall",
              Product: "Classic Bomber Jacket",
              "Units Sold": "3",
              "Net Amount": "₹11,997",
              "Sales Trend": "Stagnant (-33%)",
            },
            {
              "Invoice #": "INV-2026-7880",
              Date: "13 Sep 2026",
              "Store / Region": "Gurugram Ambience",
              Product: "Corduroy Overshirt",
              "Units Sold": "6",
              "Net Amount": "₹17,994",
              "Sales Trend": "Slow (-12%)",
            },
            {
              "Invoice #": "INV-2026-7822",
              Date: "13 Sep 2026",
              "Store / Region": "Nagpur Empress",
              Product: "Lightweight Windbreaker",
              "Units Sold": "15",
              "Net Amount": "₹44,985",
              "Sales Trend": "Normal (+6%)",
            },
            {
              "Invoice #": "INV-2026-7760",
              Date: "12 Sep 2026",
              "Store / Region": "Bhopal DB City",
              Product: "Premium Leather Belt",
              "Units Sold": "24",
              "Net Amount": "₹35,976",
              "Sales Trend": "Strong (+19%)",
            },
            {
              "Invoice #": "INV-2026-7710",
              Date: "12 Sep 2026",
              "Store / Region": "Patna City Centre",
              Product: "Striped Poplin Shirt",
              "Units Sold": "16",
              "Net Amount": "₹39,984",
              "Sales Trend": "Healthy (+10%)",
            },
            {
              "Invoice #": "INV-2026-7654",
              Date: "11 Sep 2026",
              "Store / Region": "Guwahati City Square",
              Product: "Double-Breasted Trench",
              "Units Sold": "1",
              "Net Amount": "₹7,999",
              "Sales Trend": "Frozen (-52%)",
            },
            {
              "Invoice #": "INV-2026-7601",
              Date: "11 Sep 2026",
              "Store / Region": "Vadodara Inorbit",
              Product: "Cable-Knit Cardigan",
              "Units Sold": "4",
              "Net Amount": "₹9,996",
              "Sales Trend": "Slow (-27%)",
            },
            {
              "Invoice #": "INV-2026-7540",
              Date: "10 Sep 2026",
              "Store / Region": "Online D2C Webstore",
              Product: "Canvas Chore Jacket",
              "Units Sold": "11",
              "Net Amount": "₹38,489",
              "Sales Trend": "Healthy (+9%)",
            },
          ],
        },
        {
          id: "c1-returns-ledger",
          name: "Customer Returns & Sizing Ledger",
          badge: "Returns Table",
          period: "Jun 25 – Sep 23, 2026",
          totalSum: "₹6.80 Cr",
          recordCount: "1,840 Records",
          sourceSystem: "Customer Support & Returns Portal",
          citationId: "CIT-2026-RET-18",
          description:
            "Customer return logs categorized by reason codes, fit feedback, and refunded sums.",
          columns: [
            "Return ID",
            "Return Date",
            "Channel",
            "Product",
            "Size",
            "Return Reason",
            "Refund Amount",
          ],
          rows: [
            {
              "Return ID": "RET-2026-1044",
              "Return Date": "23 Sep 2026",
              Channel: "Online App",
              Product: "Men's Denim Jacket",
              Size: "L",
              "Return Reason": "Sleeve length too long",
              "Refund Amount": "₹3,999",
            },
            {
              "Return ID": "RET-2026-1021",
              "Return Date": "22 Sep 2026",
              Channel: "Delhi Flagship",
              Product: "Women's Kurti",
              Size: "M",
              "Return Reason": "Tight shoulder fit",
              "Refund Amount": "₹1,999",
            },
            {
              "Return ID": "RET-2026-0988",
              "Return Date": "21 Sep 2026",
              Channel: "Bengaluru Indiranagar",
              Product: "Casual Trousers",
              Size: "34",
              "Return Reason": "Waist runs tight",
              "Refund Amount": "₹2,299",
            },
            {
              "Return ID": "RET-2026-0952",
              "Return Date": "20 Sep 2026",
              Channel: "Mumbai Phoenix",
              Product: "Slim Fit Shirt",
              Size: "40",
              "Return Reason": "Collar fit uncomfortable",
              "Refund Amount": "₹1,899",
            },
            {
              "Return ID": "RET-2026-0911",
              "Return Date": "19 Sep 2026",
              Channel: "Online App",
              Product: "Printed T-shirt",
              Size: "XL",
              "Return Reason": "Fabric print mismatch",
              "Refund Amount": "₹999",
            },
          ],
        },
        {
          id: "c1-inventory-ledger",
          name: "Warehouse Inventory Age & Exposure Ledger",
          badge: "Inventory Table",
          period: "As of Sep 23, 2026",
          totalSum: "₹18.40 Cr",
          recordCount: "42 Products",
          sourceSystem: "Warehouse WMS & Stock Balances",
          citationId: "CIT-2026-INV-87",
          description:
            "Inventory age distribution and exposure valuation across central and regional hubs.",
          columns: [
            "Product Name",
            "Units in Stock",
            "Avg Age",
            "Unit Cost",
            "Total Exposure",
            "Risk Level",
          ],
          rows: [
            {
              "Product Name": "Men's Denim Jacket",
              "Units in Stock": "7,000 pcs",
              "Avg Age": "124 days",
              "Unit Cost": "₹4,000",
              "Total Exposure": "₹2.80 Cr",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Women's Kurti",
              "Units in Stock": "10,500 pcs",
              "Avg Age": "109 days",
              "Unit Cost": "₹2,000",
              "Total Exposure": "₹2.10 Cr",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Slim Fit Shirt",
              "Units in Stock": "8,950 pcs",
              "Avg Age": "96 days",
              "Unit Cost": "₹1,900",
              "Total Exposure": "₹1.70 Cr",
              "Risk Level": "Moderate Risk",
            },
            {
              "Product Name": "Casual Trousers",
              "Units in Stock": "6,080 pcs",
              "Avg Age": "91 days",
              "Unit Cost": "₹2,300",
              "Total Exposure": "₹1.40 Cr",
              "Risk Level": "Moderate Risk",
            },
            {
              "Product Name": "Printed T-shirt",
              "Units in Stock": "12,000 pcs",
              "Avg Age": "86 days",
              "Unit Cost": "₹1,000",
              "Total Exposure": "₹1.20 Cr",
              "Risk Level": "Moderate Risk",
            },
            {
              "Product Name": "Relaxed Fit Utility Cargo",
              "Units in Stock": "4,200 pcs",
              "Avg Age": "82 days",
              "Unit Cost": "₹2,740",
              "Total Exposure": "₹1.15 Cr",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Heavyweight Wool Overcoat",
              "Units in Stock": "2,450 pcs",
              "Avg Age": "118 days",
              "Unit Cost": "₹4,000",
              "Total Exposure": "₹98.0 L",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Fine Gauge Merino Knit Polo",
              "Units in Stock": "3,100 pcs",
              "Avg Age": "74 days",
              "Unit Cost": "₹2,740",
              "Total Exposure": "₹85.0 L",
              "Risk Level": "Moderate Risk",
            },
            {
              "Product Name": "Vintage Wash Straight Jeans",
              "Units in Stock": "2,600 pcs",
              "Avg Age": "65 days",
              "Unit Cost": "₹3,000",
              "Total Exposure": "₹78.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "French Linen Band-Collar Shirt",
              "Units in Stock": "1,850 pcs",
              "Avg Age": "18 days",
              "Unit Cost": "₹3,510",
              "Total Exposure": "₹65.0 L",
              "Risk Level": "Stockout Risk",
            },
            {
              "Product Name": "Quilted Puffer Vest",
              "Units in Stock": "1,930 pcs",
              "Avg Age": "94 days",
              "Unit Cost": "₹3,000",
              "Total Exposure": "₹58.0 L",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Tailored Stretch Chino Pants",
              "Units in Stock": "2,400 pcs",
              "Avg Age": "58 days",
              "Unit Cost": "₹2,250",
              "Total Exposure": "₹54.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Silk Blend Resort Shirt",
              "Units in Stock": "1,220 pcs",
              "Avg Age": "22 days",
              "Unit Cost": "₹4,010",
              "Total Exposure": "₹49.0 L",
              "Risk Level": "Stockout Risk",
            },
            {
              "Product Name": "Oversized Fleece Hoodie",
              "Units in Stock": "1,800 pcs",
              "Avg Age": "88 days",
              "Unit Cost": "₹2,500",
              "Total Exposure": "₹45.0 L",
              "Risk Level": "Moderate Risk",
            },
            {
              "Product Name": "Ribbed Modal Tank Top",
              "Units in Stock": "4,200 pcs",
              "Avg Age": "45 days",
              "Unit Cost": "₹1,000",
              "Total Exposure": "₹42.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Classic Bomber Jacket",
              "Units in Stock": "1,150 pcs",
              "Avg Age": "105 days",
              "Unit Cost": "₹3,390",
              "Total Exposure": "₹39.0 L",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Stretch Cotton Bermuda Shorts",
              "Units in Stock": "2,000 pcs",
              "Avg Age": "92 days",
              "Unit Cost": "₹1,800",
              "Total Exposure": "₹36.0 L",
              "Risk Level": "Moderate Risk",
            },
            {
              "Product Name": "Corduroy Overshirt",
              "Units in Stock": "1,100 pcs",
              "Avg Age": "68 days",
              "Unit Cost": "₹3,000",
              "Total Exposure": "₹33.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Lightweight Windbreaker",
              "Units in Stock": "1,000 pcs",
              "Avg Age": "62 days",
              "Unit Cost": "₹3,000",
              "Total Exposure": "₹30.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Premium Leather Dress Belt",
              "Units in Stock": "1,860 pcs",
              "Avg Age": "55 days",
              "Unit Cost": "₹1,500",
              "Total Exposure": "₹28.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Striped Poplin Work Shirt",
              "Units in Stock": "1,040 pcs",
              "Avg Age": "48 days",
              "Unit Cost": "₹2,500",
              "Total Exposure": "₹26.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Double-Breasted Trench Coat",
              "Units in Stock": "600 pcs",
              "Avg Age": "112 days",
              "Unit Cost": "₹4,000",
              "Total Exposure": "₹24.0 L",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Cable-Knit Wool Cardigan",
              "Units in Stock": "880 pcs",
              "Avg Age": "95 days",
              "Unit Cost": "₹2,500",
              "Total Exposure": "₹22.0 L",
              "Risk Level": "Moderate Risk",
            },
            {
              "Product Name": "Athleisure Jogger Pants",
              "Units in Stock": "1,250 pcs",
              "Avg Age": "42 days",
              "Unit Cost": "₹1,600",
              "Total Exposure": "₹20.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Canvas Chore Jacket",
              "Units in Stock": "514 pcs",
              "Avg Age": "76 days",
              "Unit Cost": "₹3,500",
              "Total Exposure": "₹18.0 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Chambray Casual Button-Down",
              "Units in Stock": "620 pcs",
              "Avg Age": "51 days",
              "Unit Cost": "₹2,400",
              "Total Exposure": "₹14.9 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Waxed Cotton Field Parka",
              "Units in Stock": "310 pcs",
              "Avg Age": "116 days",
              "Unit Cost": "₹4,200",
              "Total Exposure": "₹13.0 L",
              "Risk Level": "High Risk",
            },
            {
              "Product Name": "Relaxed Linen Drawstring Trouser",
              "Units in Stock": "480 pcs",
              "Avg Age": "24 days",
              "Unit Cost": "₹2,500",
              "Total Exposure": "₹12.0 L",
              "Risk Level": "Stockout Risk",
            },
            {
              "Product Name": "Brushed Flannel Plaid Shirt",
              "Units in Stock": "440 pcs",
              "Avg Age": "72 days",
              "Unit Cost": "₹2,200",
              "Total Exposure": "₹9.7 L",
              "Risk Level": "Watching",
            },
            {
              "Product Name": "Pima Cotton Crew Undershirt (3-Pack)",
              "Units in Stock": "650 pcs",
              "Avg Age": "30 days",
              "Unit Cost": "₹1,400",
              "Total Exposure": "₹9.1 L",
              "Risk Level": "Optimal",
            },
          ],
        },
      ],
      dataSources: [
        "Store stock counts from 42 retail shops",
        "Daily customer sales bills from the last 90 days",
        "Warehouse storage logs showing how old each item is",
        "Normal sales targets for this season",
      ],
      methodology:
        "We flagged clothes that have been in stock for over 60 days with sales falling by more than 15%. We then added up the money tied up in these items.",
    },
  },
  "case-2": {
    reportTitle: "New launch results: What is selling and what is not",
    reportDate: "September 2026",
    kpiStats: [
      { value: "84.2%", label: "Linen Sales Rate" },
      { value: "28.0%", label: "Cargo Pants Sales Rate" },
      { value: "₹6.4 Cr", label: "New Launch Sales" },
      { value: "3.2x", label: "Sales Gap" },
    ],
    keyFinding:
      "New Linen shirts are selling very fast (84% sold in 18 days).\nCargo pants are selling very slowly (only 28% sold) due to waist fitting issues.\nDigital ad spending is currently misallocated to slow-moving pants.",
    findingChart: {
      title: "Launch Sell-Through Velocity vs Benchmark",
      subtitle: "Actual 18-day sell-through compared against 55% category target",
      badge: "3.2x Velocity Gap",
      type: "benchmark",
      benchmarkLabel: "Target Benchmark",
      benchmarkValue: 55,
      bars: [
        {
          label: "Band-Collar Linen Shirt",
          value: 84.2,
          formattedValue: "84.2%",
          subtext: "Exceeds target by +29.2% (Viral)",
          color: "bg-emerald-600",
        },
        {
          label: "French Linen Over-Shirt",
          value: 78.0,
          formattedValue: "78.0%",
          subtext: "Exceeds target by +23.0% (Strong)",
          color: "bg-emerald-500",
        },
        {
          label: "High-Rise Utility Cargo",
          value: 28.0,
          formattedValue: "28.0%",
          subtext: "Lags target by -27.0% (Fit issues)",
          color: "bg-rose-500",
          isWarning: true,
        },
        {
          label: "Cropped Cargo Trouser",
          value: 22.0,
          formattedValue: "22.0%",
          subtext: "Lags target by -33.0% (Returns)",
          color: "bg-rose-600",
          isWarning: true,
        },
      ],
      takeaway:
        "Linen styles sold 3.2x faster than Cargo pants, which suffered high return rates from waist fitting issues.",
    },
    topProducts: [
      {
        product: "Band-Collar Linen Shirt",
        inventory: "₹2.2 Cr",
        age: "18 days",
        salesTrend: "↑ 84%",
      },
      {
        product: "French Linen Over-Shirt",
        inventory: "₹1.8 Cr",
        age: "18 days",
        salesTrend: "↑ 78%",
      },
      {
        product: "High-Rise Utility Cargo",
        inventory: "₹1.4 Cr",
        age: "18 days",
        salesTrend: "↓ 28%",
      },
      {
        product: "Cropped Cargo Trouser",
        inventory: "₹0.9 Cr",
        age: "18 days",
        salesTrend: "↓ 22%",
      },
    ],
    drivers: [
      { label: "High customer demand for Linen", value: "₹3.8 Cr" },
      { label: "Fitting issues causing Cargo returns", value: "₹1.4 Cr" },
      { label: "Ad budget spent on slow items", value: "₹0.8 Cr" },
      { label: "Popular sizes ran out too early", value: "₹0.4 Cr" },
    ],
    insights: [
      {
        number: "01",
        headline: "Linen is a hit, Cargo is struggling",
        detail:
          "Linen shirts sold 3 times faster than expected, while Cargo pants faced sizing complaints.",
      },
      {
        number: "02",
        headline: "High return rate on Cargo pants",
        detail: "About 1 in every 3 buyers returned the cargo pants due to waist fitting problems.",
      },
      {
        number: "03",
        headline: "Ads are running for the wrong items",
        detail: "Most of our ad budget was spent promoting items that customers are not buying.",
      },
    ],
    businessImpact:
      "Too much money is stuck in slow-selling pants, while our best-selling linen shirts are about to run out of stock.",
    focusAreas: [
      "Move ad budget from Cargo pants to Linen shirts",
      "Fix the waist sizing on future Cargo pant batches",
      "Show customers how to style and fit high-rise pants",
    ],
    howAnswerFound: {
      summary:
        "We tracked sales from the first 18 days of the launch, checking store bills, online orders, and customer return reasons.",
      analysis:
        "Analyzed the first 18 days of launch sales invoices (₹6.40 Cr total) and return records across physical stores and online channels (September 5 – 23, 2026). We calculated product sell-through rates against launch allocation targets and correlated customer return tags with digital ad spending.",
      findings: [
        "Launch Sales analyzed: ₹6.40 Cr generated across 4 launch categories in 18 days.",
        "Linen shirts achieved an 84.2% sell-through rate, outperforming launch targets by 3.2x.",
        "Cargo pants recorded ₹1.40 Cr in customer returns with a 34% return rate caused by waist-fit issues.",
        "Digital ad spend of ₹0.80 Cr was heavily directed at low-converting cargo silhouettes instead of high-demand linen.",
      ],
      evidenceDatasets: [
        {
          id: "c2-launch-sales",
          name: "New Launch Sales Invoices (First 18 Days)",
          badge: "Sales Table",
          period: "Sep 5 – Sep 23, 2026",
          totalSum: "₹6.40 Cr",
          recordCount: "8,920 Invoices",
          sourceSystem: "Omnichannel Launch Sales Feed",
          citationId: "CIT-2026-LNCH-SLS",
          description:
            "All sales receipts for newly launched fall silhouettes across online and offline stores.",
          columns: [
            "Order ID",
            "Date",
            "Channel",
            "Style Name",
            "Units Sold",
            "Amount",
            "Sell-Through Rate",
          ],
          rows: [
            {
              "Order ID": "ORD-LN-0192",
              Date: "23 Sep 2026",
              Channel: "Online Store",
              "Style Name": "Band-Collar Linen Shirt (Sky)",
              "Units Sold": "2",
              Amount: "₹4,998",
              "Sell-Through Rate": "84.2% (Viral)",
            },
            {
              "Order ID": "ORD-LN-0185",
              Date: "23 Sep 2026",
              Channel: "Mumbai Flagship",
              "Style Name": "French Linen Over-Shirt (Sand)",
              "Units Sold": "3",
              Amount: "₹8,397",
              "Sell-Through Rate": "78.0% (Strong)",
            },
            {
              "Order ID": "ORD-LN-0171",
              Date: "22 Sep 2026",
              Channel: "Bengaluru Store",
              "Style Name": "High-Rise Utility Cargo (Olive)",
              "Units Sold": "1",
              Amount: "₹2,999",
              "Sell-Through Rate": "28.0% (Lagging)",
            },
            {
              "Order ID": "ORD-LN-0164",
              Date: "22 Sep 2026",
              Channel: "Online App",
              "Style Name": "Cropped Cargo Trouser (Black)",
              "Units Sold": "1",
              Amount: "₹2,799",
              "Sell-Through Rate": "22.0% (Lagging)",
            },
            {
              "Order ID": "ORD-LN-0150",
              Date: "21 Sep 2026",
              Channel: "Delhi Flagship",
              "Style Name": "Band-Collar Linen Shirt (White)",
              "Units Sold": "4",
              Amount: "₹9,996",
              "Sell-Through Rate": "86.5% (Stockout Risk)",
            },
            {
              "Order ID": "ORD-LN-0142",
              Date: "21 Sep 2026",
              Channel: "Hyderabad Store",
              "Style Name": "French Linen Over-Shirt (Olive)",
              "Units Sold": "2",
              Amount: "₹5,598",
              "Sell-Through Rate": "76.4% (Strong)",
            },
            {
              "Order ID": "ORD-LN-0136",
              Date: "20 Sep 2026",
              Channel: "Online Store",
              "Style Name": "Band-Collar Linen Shirt (Navy)",
              "Units Sold": "5",
              Amount: "₹12,495",
              "Sell-Through Rate": "89.0% (Stockout Risk)",
            },
            {
              "Order ID": "ORD-LN-0129",
              Date: "20 Sep 2026",
              Channel: "Pune Store",
              "Style Name": "High-Rise Utility Cargo (Khaki)",
              "Units Sold": "1",
              Amount: "₹2,999",
              "Sell-Through Rate": "26.5% (Lagging)",
            },
            {
              "Order ID": "ORD-LN-0118",
              Date: "19 Sep 2026",
              Channel: "Chennai Store",
              "Style Name": "Relaxed Linen Pants (Ecru)",
              "Units Sold": "3",
              Amount: "₹8,997",
              "Sell-Through Rate": "81.2% (Strong)",
            },
            {
              "Order ID": "ORD-LN-0105",
              Date: "19 Sep 2026",
              Channel: "Online App",
              "Style Name": "Cropped Cargo Trouser (Olive)",
              "Units Sold": "1",
              Amount: "₹2,799",
              "Sell-Through Rate": "24.0% (Lagging)",
            },
            {
              "Order ID": "ORD-LN-0094",
              Date: "18 Sep 2026",
              Channel: "Kolkata Store",
              "Style Name": "French Linen Over-Shirt (Charcoal)",
              "Units Sold": "3",
              Amount: "₹8,397",
              "Sell-Through Rate": "74.8% (Strong)",
            },
            {
              "Order ID": "ORD-LN-0082",
              Date: "18 Sep 2026",
              Channel: "Online Store",
              "Style Name": "Band-Collar Linen Shirt (Stripe)",
              "Units Sold": "4",
              Amount: "₹10,796",
              "Sell-Through Rate": "92.4% (Viral)",
            },
            {
              "Order ID": "ORD-LN-0071",
              Date: "17 Sep 2026",
              Channel: "Ahmedabad Store",
              "Style Name": "High-Rise Utility Cargo (Black)",
              "Units Sold": "2",
              Amount: "₹5,998",
              "Sell-Through Rate": "29.1% (Lagging)",
            },
            {
              "Order ID": "ORD-LN-0060",
              Date: "17 Sep 2026",
              Channel: "Jaipur Store",
              "Style Name": "Relaxed Linen Shorts (Navy)",
              "Units Sold": "6",
              Amount: "₹11,994",
              "Sell-Through Rate": "83.0% (Strong)",
            },
            {
              "Order ID": "ORD-LN-0049",
              Date: "16 Sep 2026",
              Channel: "Chandigarh Store",
              "Style Name": "Cropped Cargo Trouser (Tan)",
              "Units Sold": "1",
              Amount: "₹2,799",
              "Sell-Through Rate": "21.5% (Lagging)",
            },
          ],
        },
        {
          id: "c2-launch-returns",
          name: "Launch Returns & Fit Complaints Log",
          badge: "Returns Table",
          period: "Sep 5 – Sep 23, 2026",
          totalSum: "₹1.40 Cr",
          recordCount: "940 Return Slips",
          sourceSystem: "Customer Feedback & Returns Log",
          citationId: "CIT-2026-LNCH-RET",
          description:
            "Granular return audit logs highlighting customer feedback reasons for launch merchandise.",
          columns: [
            "Return ID",
            "Date",
            "Product Style",
            "Size",
            "Customer Complaint",
            "Refund Amount",
            "Action",
          ],
          rows: [
            {
              "Return ID": "RET-CRG-044",
              Date: "23 Sep 2026",
              "Product Style": "High-Rise Utility Cargo",
              Size: "30",
              "Customer Complaint": "Waist runs 1.5 inches too tight",
              "Refund Amount": "₹2,999",
              Action: "Fit Grading Audit",
            },
            {
              "Return ID": "RET-CRG-039",
              Date: "22 Sep 2026",
              "Product Style": "Cropped Cargo Trouser",
              Size: "32",
              "Customer Complaint": "Inseam length uneven",
              "Refund Amount": "₹2,799",
              Action: "QC Pattern Check",
            },
            {
              "Return ID": "RET-CRG-031",
              Date: "21 Sep 2026",
              "Product Style": "High-Rise Utility Cargo",
              Size: "28",
              "Customer Complaint": "Hip-to-waist ratio uncomfortable",
              "Refund Amount": "₹2,999",
              Action: "Fit Grading Audit",
            },
            {
              "Return ID": "RET-CRG-025",
              Date: "20 Sep 2026",
              "Product Style": "High-Rise Utility Cargo",
              Size: "34",
              "Customer Complaint": "Button snap defective",
              "Refund Amount": "₹2,999",
              Action: "Hardware Replacement",
            },
            {
              "Return ID": "RET-CRG-021",
              Date: "20 Sep 2026",
              "Product Style": "Cropped Cargo Trouser",
              Size: "30",
              "Customer Complaint": "Pocket placement too low",
              "Refund Amount": "₹2,799",
              Action: "Design Review",
            },
            {
              "Return ID": "RET-CRG-018",
              Date: "19 Sep 2026",
              "Product Style": "High-Rise Utility Cargo",
              Size: "32",
              "Customer Complaint": "Waist band stiff, no stretch",
              "Refund Amount": "₹2,999",
              Action: "Fabric Blend Revision",
            },
            {
              "Return ID": "RET-CRG-014",
              Date: "18 Sep 2026",
              "Product Style": "Cropped Cargo Trouser",
              Size: "36",
              "Customer Complaint": "Tight around thigh area",
              "Refund Amount": "₹2,799",
              Action: "Fit Grading Audit",
            },
            {
              "Return ID": "RET-CRG-009",
              Date: "17 Sep 2026",
              "Product Style": "High-Rise Utility Cargo",
              Size: "30",
              "Customer Complaint": "Length 2 inches longer than spec",
              "Refund Amount": "₹2,999",
              Action: "QC Inseam Tolerance",
            },
            {
              "Return ID": "RET-CRG-004",
              Date: "16 Sep 2026",
              "Product Style": "Cropped Cargo Trouser",
              Size: "28",
              "Customer Complaint": "Fly zipper sticks",
              "Refund Amount": "₹2,799",
              Action: "Hardware Supplier Review",
            },
            {
              "Return ID": "RET-LNN-002",
              Date: "16 Sep 2026",
              "Product Style": "Band-Collar Linen Shirt",
              Size: "XL",
              "Customer Complaint": "Ordered wrong size (wanted L)",
              "Refund Amount": "₹2,499",
              Action: "Exchange Processed",
            },
          ],
        },
        {
          id: "c2-marketing-ad-spend",
          name: "Digital Ad Campaign & Spend Log",
          badge: "Marketing Table",
          period: "Sep 5 – Sep 23, 2026",
          totalSum: "₹0.80 Cr",
          recordCount: "24 Campaigns",
          sourceSystem: "Ad Engine Analytics Feed",
          citationId: "CIT-2026-MKTG-SPD",
          description:
            "Ad spend distribution by category showing misallocated budget towards slow-moving pants.",
          columns: [
            "Campaign ID",
            "Target Product",
            "Ad Spend",
            "Impressions",
            "Purchases",
            "ROAS",
            "Recommendation",
          ],
          rows: [
            {
              "Campaign ID": "CMP-META-CARGO-01",
              "Target Product": "High-Rise Utility Cargo",
              "Ad Spend": "₹38,00,000",
              Impressions: "4.2M",
              Purchases: "420",
              ROAS: "0.9x",
              Recommendation: "Pause Campaign",
            },
            {
              "Campaign ID": "CMP-META-LINEN-02",
              "Target Product": "Band-Collar Linen Shirt",
              "Ad Spend": "₹18,00,000",
              Impressions: "2.1M",
              Purchases: "1,980",
              ROAS: "4.8x",
              Recommendation: "Scale +250%",
            },
            {
              "Campaign ID": "CMP-GOOGLE-CRG-03",
              "Target Product": "Cropped Cargo Trouser",
              "Ad Spend": "₹16,00,000",
              Impressions: "1.8M",
              Purchases: "190",
              ROAS: "0.7x",
              Recommendation: "Reallocate Budget",
            },
            {
              "Campaign ID": "CMP-INFLUENCER-04",
              "Target Product": "French Linen Over-Shirt",
              "Ad Spend": "₹8,00,000",
              Impressions: "1.4M",
              Purchases: "840",
              ROAS: "3.9x",
              Recommendation: "Expand Partnerships",
            },
          ],
        },
      ],
      dataSources: [
        "Store and website sales numbers for new items",
        "Customer feedback and return reasons for wrong fits",
        "Online ad spending logs for each style",
      ],
      methodology:
        "We compared actual sales against our sales goals to find out which new styles are popular and which are being returned.",
    },
  },
  "case-3": {
    reportTitle: "Jeans sales share and factory reliance risk",
    reportDate: "September 2026",
    kpiStats: [
      { value: "42.6%", label: "Share of Total Sales" },
      { value: "78.5%", label: "Cloth from 1 Factory" },
      { value: "₹12.8 Cr", label: "Monthly Jeans Sales" },
      { value: "64.0%", label: "Repeat Buyers" },
    ],
    keyFinding:
      "Our main jeans styles bring in 43% of all sales (₹12.8 Cr per month) with high repeat buyers.\nNearly 80% of our denim fabric comes from just one spinning mill in Coimbatore.\nZero backup certified mills create a severe supply disruption vulnerability.",
    findingChart: {
      title: "Revenue Dominance vs Single-Mill Risk",
      subtitle: "Jeans portfolio contribution alongside Coimbatore mill allocation",
      badge: "78.5% Mill Reliance",
      type: "share",
      secondaryBreakdown: [
        { label: "Coimbatore Mill", value: "78.5%", percentage: 78.5, color: "bg-rose-500" },
        { label: "Other Suppliers", value: "21.5%", percentage: 21.5, color: "bg-emerald-500" },
      ],
      bars: [
        {
          label: "Denim Share of Apparel Sales",
          value: 42.6,
          formattedValue: "42.6%",
          subtext: "₹12.8 Cr/mo revenue contribution",
          color: "bg-[#0e7490]",
        },
        {
          label: "Coimbatore Mill Sourcing Share",
          value: 78.5,
          formattedValue: "78.5%",
          subtext: "Safe diversification limit is 40.0%",
          color: "bg-rose-500",
          isWarning: true,
        },
        {
          label: "Repeat Denim Shoppers",
          value: 64.0,
          formattedValue: "64.0%",
          subtext: "Strong customer loyalty and cross-sell",
          color: "bg-emerald-600",
        },
      ],
      takeaway:
        "Jeans account for 43% of company sales but 78.5% of fabric comes from one mill with a 45-day turnaround.",
    },
    topProducts: [
      {
        product: "Slim Stretch Denim (Indigo)",
        inventory: "₹3.8 Cr",
        age: "45 days",
        salesTrend: "↑ 18%",
      },
      {
        product: "Relaxed Vintage Denim (Light)",
        inventory: "₹3.1 Cr",
        age: "52 days",
        salesTrend: "↑ 14%",
      },
      {
        product: "Classic Straight Leg Denim",
        inventory: "₹2.2 Cr",
        age: "60 days",
        salesTrend: "→ 2%",
      },
      {
        product: "High-Rise Tapered Denim",
        inventory: "₹1.7 Cr",
        age: "58 days",
        salesTrend: "↑ 8%",
      },
    ],
    drivers: [
      { label: "Relying on one fabric mill", value: "₹8.5 Cr" },
      { label: "Strong customer love for our jeans", value: "₹3.2 Cr" },
      { label: "Lack of backup suppliers", value: "₹0.8 Cr" },
      { label: "Low extra cloth in reserve", value: "₹0.3 Cr" },
    ],
    insights: [
      {
        number: "01",
        headline: "Jeans drive our business",
        detail: "Jeans are our biggest money-maker and bring back the most customers.",
      },
      {
        number: "02",
        headline: "Big risk if the factory stops",
        detail: "If the single supplier in Coimbatore pauses work, ₹8.5 Cr in sales is at risk.",
      },
      {
        number: "03",
        headline: "Jeans buyers also buy other clothes",
        detail: "Shoppers who buy our jeans are the most likely to buy shirts and jackets too.",
      },
    ],
    businessImpact:
      "If our main cloth supplier has any delay, nearly half of our company revenue will take a severe hit within 3 weeks.",
    focusAreas: [
      "Find and approve a backup denim cloth mill",
      "Keep a 45-day emergency reserve of denim fabric in stock",
      "Sign a 1-year steady supply deal with our top mill",
    ],
    howAnswerFound: {
      summary:
        "We looked at where we buy our cloth and checked which products generate the most repeat sales.",
      analysis:
        "Analyzed monthly sales invoices totaling ₹12.80 Cr across all denim lines alongside fabric procurement purchase orders totaling ₹8.50 Cr over the past 90 days. We calculated factory allocation shares and cross-referenced mill delivery lead times to evaluate single-point supply vulnerabilities.",
      findings: [
        "Monthly Jeans Revenue analyzed: ₹12.80 Cr across 4 core denim lines, accounting for 42.6% of overall apparel sales.",
        "Fabric Procurement POs analyzed: ₹8.50 Cr total fabric spend over the last 90 days.",
        "Mill Dependency: 78.5% of all denim yardage comes from a single spinning mill in Coimbatore.",
        "Lead-time vulnerability: Average mill lead time is 45 days, with zero alternate mills currently certified for production.",
      ],
      evidenceDatasets: [
        {
          id: "c3-denim-sales",
          name: "Denim Sales Invoices & Repeat Purchases",
          badge: "Sales Table",
          period: "Aug 24 – Sep 23, 2026",
          totalSum: "₹12.80 Cr / Mo",
          recordCount: "18,400 Invoices",
          sourceSystem: "Core POS & Customer Loyalty Feed",
          citationId: "CIT-2026-DNM-SLS",
          description:
            "Monthly customer purchases across all 4 key denim styles and repeat customer buyer shares.",
          columns: ["Invoice #", "Date", "Denim Style", "Fit", "Units", "Revenue", "Buyer Type"],
          rows: [
            {
              "Invoice #": "INV-DNM-9011",
              Date: "23 Sep 2026",
              "Denim Style": "Slim Stretch Denim",
              Fit: "Dark Indigo",
              Units: "2",
              Revenue: "₹5,998",
              "Buyer Type": "Repeat Buyer (3rd time)",
            },
            {
              "Invoice #": "INV-DNM-8984",
              Date: "22 Sep 2026",
              "Denim Style": "Relaxed Vintage Denim",
              Fit: "Light Wash",
              Units: "1",
              Revenue: "₹3,499",
              "Buyer Type": "Repeat Buyer (2nd time)",
            },
            {
              "Invoice #": "INV-DNM-8950",
              Date: "22 Sep 2026",
              "Denim Style": "Classic Straight Leg Denim",
              Fit: "Raw Rinse",
              Units: "1",
              Revenue: "₹2,999",
              "Buyer Type": "New Buyer",
            },
            {
              "Invoice #": "INV-DNM-8912",
              Date: "21 Sep 2026",
              "Denim Style": "High-Rise Tapered Denim",
              Fit: "Washed Blue",
              Units: "2",
              Revenue: "₹6,398",
              "Buyer Type": "Repeat Buyer (4th time)",
            },
          ],
        },
        {
          id: "c3-mill-procurement",
          name: "Fabric Purchase Orders & Mill Allocation",
          badge: "Procurement Table",
          period: "Last 90 Days",
          totalSum: "₹8.50 Cr Fabric POs",
          recordCount: "36 Purchase Orders",
          sourceSystem: "ERP Sourcing & Mill Allocation DB",
          citationId: "CIT-2026-SPLY-PO",
          description: "Fabric yardage orders showing severe dependency on Coimbatore Mill.",
          columns: [
            "PO Number",
            "Issue Date",
            "Supplier Mill",
            "Fabric Type",
            "Meters Ordered",
            "PO Value",
            "Allocation %",
          ],
          rows: [
            {
              "PO Number": "PO-TEX-2026-081",
              "Issue Date": "15 Sep 2026",
              "Supplier Mill": "Coimbatore Spinning Mill",
              "Fabric Type": "12oz Ring-Spun Stretch Denim",
              "Meters Ordered": "80,000 m",
              "PO Value": "₹3,40,00,000",
              "Allocation %": "78.5% (Dominant)",
            },
            {
              "PO Number": "PO-TEX-2026-074",
              "Issue Date": "28 Aug 2026",
              "Supplier Mill": "Coimbatore Spinning Mill",
              "Fabric Type": "11oz Vintage Light Indigo",
              "Meters Ordered": "65,000 m",
              "PO Value": "₹2,80,00,000",
              "Allocation %": "78.5% (Dominant)",
            },
            {
              "PO Number": "PO-TEX-2026-068",
              "Issue Date": "10 Aug 2026",
              "Supplier Mill": "Ahmedabad Textiles Ltd",
              "Fabric Type": "10oz Raw Twill Pocketing",
              "Meters Ordered": "25,000 m",
              "PO Value": "₹95,00,000",
              "Allocation %": "14.2% (Secondary)",
            },
            {
              "PO Number": "PO-TEX-2026-059",
              "Issue Date": "22 Jul 2026",
              "Supplier Mill": "Surat Specialty Weaves",
              "Fabric Type": "Poly-Cotton Trim & Threads",
              "Meters Ordered": "18,000 m",
              "PO Value": "₹65,00,000",
              "Allocation %": "7.3% (Tertiary)",
            },
          ],
        },
        {
          id: "c3-mill-lead-time",
          name: "Supplier Lead Time & Buffer Stock Log",
          badge: "Supplier Table",
          period: "As of Sep 2026",
          totalSum: "45 Days Lead Time",
          recordCount: "12 Delivery Runs",
          sourceSystem: "Inbound Supply Chain Records",
          citationId: "CIT-2026-SPLY-LDT",
          description:
            "Mill manufacturing turnaround and reserve stock levels against safety buffer thresholds.",
          columns: [
            "Mill Name",
            "Location",
            "Avg Lead Time",
            "Monthly Capacity",
            "Current Buffer Days",
            "Status",
          ],
          rows: [
            {
              "Mill Name": "Coimbatore Spinning Mill",
              Location: "Coimbatore, Tamil Nadu",
              "Avg Lead Time": "45 Days",
              "Monthly Capacity": "140,000 meters",
              "Current Buffer Days": "12 Days (Deficit)",
              Status: "Critical Single Source",
            },
            {
              "Mill Name": "Ahmedabad Textiles Ltd",
              Location: "Ahmedabad, Gujarat",
              "Avg Lead Time": "30 Days",
              "Monthly Capacity": "50,000 meters",
              "Current Buffer Days": "35 Days (Healthy)",
              Status: "Secondary Trim Only",
            },
            {
              "Mill Name": "Surat Specialty Weaves",
              Location: "Surat, Gujarat",
              "Avg Lead Time": "24 Days",
              "Monthly Capacity": "30,000 meters",
              "Current Buffer Days": "40 Days (Healthy)",
              Status: "Accessories Only",
            },
          ],
        },
      ],
      dataSources: [
        "Supplier and cloth mill purchase orders",
        "Customer repeat purchase records over the past 90 days",
        "Fabric delivery lead times and emergency stock counts",
      ],
      methodology:
        "We matched our top-selling jeans against our fabric suppliers to see how dependent we are on a single mill.",
    },
  },
  "case-4": {
    reportTitle: "Old season products losing sales and next steps",
    reportDate: "September 2026",
    kpiStats: [
      { value: "-35.4%", label: "Monthly Sales Drop" },
      { value: "8,420", label: "Unsold Pieces" },
      { value: "₹4.8 Cr", label: "Stuck Money" },
      { value: "61.2%", label: "Very Small or Big Sizes" },
    ],
    keyFinding:
      "Warm winter polo shirts and thermal tops dropped 35% in sales this month.\n8,420 unsold pieces remain trapped across warehouse and store shelves.\n61% of trapped inventory is concentrated in extreme sizes (XS and XXL).",
    findingChart: {
      title: "Unsold Units Trapped by Size Run",
      subtitle: "8,420 unsold winter pieces heavily skewed toward extreme sizes",
      badge: "61.2% Extreme Sizes",
      type: "distribution",
      secondaryBreakdown: [
        {
          label: "Extreme Sizes (XS & XXL)",
          value: "5,150 pcs (61.2%)",
          percentage: 61.2,
          color: "bg-amber-500",
        },
        {
          label: "Core Sizes (S, M, L, XL)",
          value: "3,270 pcs (38.8%)",
          percentage: 38.8,
          color: "bg-[#0e7490]",
        },
      ],
      bars: [
        {
          label: "Merino Wool Knit Polo",
          value: 38,
          formattedValue: "↓ 38%",
          subtext: "₹1.8 Cr stuck · 115 days old",
          color: "bg-rose-500",
          isWarning: true,
        },
        {
          label: "Thermal Waffle Henley",
          value: 33,
          formattedValue: "↓ 33%",
          subtext: "₹1.4 Cr stuck · 98 days old",
          color: "bg-rose-500",
          isWarning: true,
        },
        {
          label: "Ribbed Crewneck Knit",
          value: 29,
          formattedValue: "↓ 29%",
          subtext: "₹0.9 Cr stuck · 92 days old",
          color: "bg-amber-500",
          isWarning: true,
        },
        {
          label: "Fine Gauge Cardigan",
          value: 21,
          formattedValue: "↓ 21%",
          subtext: "₹0.7 Cr stuck · 84 days old",
          color: "bg-amber-500",
          isWarning: true,
        },
      ],
      takeaway:
        "Winter knitwear sales dropped 35% MoM, leaving 8,420 units primarily trapped in hard-to-sell XS and XXL sizes.",
    },
    topProducts: [
      {
        product: "Merino Wool Knit Polo",
        inventory: "₹1.8 Cr",
        age: "115 days",
        salesTrend: "↓ 38%",
      },
      {
        product: "Thermal Waffle Henley",
        inventory: "₹1.4 Cr",
        age: "98 days",
        salesTrend: "↓ 33%",
      },
      {
        product: "Ribbed Crewneck Knit",
        inventory: "₹0.9 Cr",
        age: "92 days",
        salesTrend: "↓ 29%",
      },
      { product: "Fine Gauge Cardigan", inventory: "₹0.7 Cr", age: "84 days", salesTrend: "↓ 21%" },
    ],
    drivers: [
      { label: "Weather warming up (winter ended)", value: "₹2.6 Cr" },
      { label: "Leftover extreme sizes (XS/XXL)", value: "₹1.4 Cr" },
      { label: "Unplanned discounts by store managers", value: "₹0.6 Cr" },
      { label: "Colors from last season", value: "₹0.2 Cr" },
    ],
    insights: [
      {
        number: "01",
        headline: "Season has changed",
        detail: "Shoppers want light summer shirts now instead of heavy winter tops.",
      },
      {
        number: "02",
        headline: "Only extreme sizes left",
        detail: "Most leftover clothes are in very small or very large sizes that sell slowly.",
      },
      {
        number: "03",
        headline: "Prices are dropping",
        detail: "Stores gave random discounts, lowering the money made on each item by 30%.",
      },
    ],
    businessImpact:
      "Old winter clothes are taking up valuable shelf space that should hold fresh, fast-selling summer items.",
    focusAreas: [
      "Start a clear 25% then 40% clearance sale across all stores",
      "Move XS and XXL sizes to our website where more buyers search",
      "Stop ordering slow winter colors for the next season",
    ],
    howAnswerFound: {
      summary:
        "We looked at weekly sales trends across all sizes to see which winter clothes stopped selling as weather warmed up.",
      analysis:
        "Analyzed 8 weeks of store sales receipts (₹4.80 Cr trapped inventory) and size-level stock ledgers across 8,420 unsold winter pieces. We calculated week-over-week velocity drop-offs and quantified markdown loss rates across size distributions.",
      findings: [
        "Unsold Inventory analyzed: ₹4.80 Cr across 8,420 pieces of winter knitwear and outerwear.",
        "Weekly Sales Contraction: Sales fell by 35.4% month-over-month as seasonal weather warmed.",
        "Size Skew: 61.2% of remaining unsold garments are concentrated in extreme sizes (XS and XXL).",
        "Markdown Leakage: ₹0.60 Cr lost through inconsistent store-level discount promotions.",
      ],
      evidenceDatasets: [
        {
          id: "c4-winter-sales",
          name: "Winter Category Weekly Sales Trend",
          badge: "Sales Table",
          period: "Aug 1 – Sep 23, 2026",
          totalSum: "₹4.80 Cr Stuck Stock",
          recordCount: "8 Weeks",
          sourceSystem: "Weekly POS Audits & Category Analytics",
          citationId: "CIT-2026-WNTR-SLS",
          description:
            "Week-by-week drop in knitwear sales demonstrating end-of-season lifecycle contraction.",
          columns: [
            "Week Ending",
            "Category",
            "Units Sold",
            "Gross Revenue",
            "WoW Trend",
            "Avg Discount",
          ],
          rows: [
            {
              "Week Ending": "23 Sep 2026",
              Category: "Merino Wool Knitwear",
              "Units Sold": "142 pcs",
              "Gross Revenue": "₹4,26,000",
              "WoW Trend": "↓ 38.2%",
              "Avg Discount": "18.5%",
            },
            {
              "Week Ending": "16 Sep 2026",
              Category: "Merino Wool Knitwear",
              "Units Sold": "230 pcs",
              "Gross Revenue": "₹6,90,00,00",
              "WoW Trend": "↓ 29.4%",
              "Avg Discount": "15.0%",
            },
            {
              "Week Ending": "09 Sep 2026",
              Category: "Thermal Henleys & Fleeces",
              "Units Sold": "326 pcs",
              "Gross Revenue": "₹9,78,000",
              "WoW Trend": "↓ 21.0%",
              "Avg Discount": "10.0%",
            },
            {
              "Week Ending": "02 Sep 2026",
              Category: "Winter Outerwear",
              "Units Sold": "410 pcs",
              "Gross Revenue": "₹16,40,000",
              "WoW Trend": "↓ 18.5%",
              "Avg Discount": "5.0%",
            },
          ],
        },
        {
          id: "c4-unsold-sizes",
          name: "Unsold Stock by Size Run & SKU",
          badge: "Inventory Table",
          period: "As of Sep 23, 2026",
          totalSum: "8,420 Unsold Units",
          recordCount: "16 SKU Size Runs",
          sourceSystem: "WMS Inventory Breakdown",
          citationId: "CIT-2026-SIZE-RUN",
          description:
            "Garment size distribution audit revealing high concentration in slow-moving XS and XXL.",
          columns: [
            "SKU Code",
            "Product Name",
            "Size",
            "Units Remaining",
            "Holding Cost",
            "Size Run %",
          ],
          rows: [
            {
              "SKU Code": "SKU-POLO-XS",
              "Product Name": "Merino Knit Polo (Rust)",
              Size: "XS",
              "Units Remaining": "2,480 pcs",
              "Holding Cost": "₹44,64,000",
              "Size Run %": "29.4%",
            },
            {
              "SKU Code": "SKU-POLO-XXL",
              "Product Name": "Merino Knit Polo (Rust)",
              Size: "XXL",
              "Units Remaining": "2,670 pcs",
              "Holding Cost": "₹48,06,000",
              "Size Run %": "31.8%",
            },
            {
              "SKU Code": "SKU-HEN-XS",
              "Product Name": "Thermal Waffle Henley",
              Size: "XS",
              "Units Remaining": "1,450 pcs",
              "Holding Cost": "₹26,10,000",
              "Size Run %": "17.2%",
            },
            {
              "SKU Code": "SKU-CRD-XXL",
              "Product Name": "Fine Gauge Cardigan",
              Size: "XXL",
              "Units Remaining": "1,820 pcs",
              "Holding Cost": "₹36,40,000",
              "Size Run %": "21.6%",
            },
          ],
        },
        {
          id: "c4-markdown-ledger",
          name: "Store Clearance & Markdown Ledger",
          badge: "Markdowns Table",
          period: "Aug 15 – Sep 23, 2026",
          totalSum: "₹0.60 Cr Discounted",
          recordCount: "420 Markdown Events",
          sourceSystem: "Store Pricing & Discount Log",
          citationId: "CIT-2026-MKDN-LOG",
          description:
            "Unplanned store-level discount promotions resulting in margin dilution without clearing volume.",
          columns: [
            "Markdown ID",
            "Store Name",
            "Product",
            "Original Price",
            "Clearance Price",
            "Discount %",
            "Margin Impact",
          ],
          rows: [
            {
              "Markdown ID": "MKD-0419",
              "Store Name": "Delhi Connaught",
              Product: "Merino Knit Polo",
              "Original Price": "₹2,999",
              "Clearance Price": "₹2,099",
              "Discount %": "30%",
              "Margin Impact": "-₹900 / unit",
            },
            {
              "Markdown ID": "MKD-0412",
              "Store Name": "Mumbai Bandra",
              Product: "Thermal Waffle Henley",
              "Original Price": "₹2,499",
              "Clearance Price": "₹1,749",
              "Discount %": "30%",
              "Margin Impact": "-₹750 / unit",
            },
            {
              "Markdown ID": "MKD-0398",
              "Store Name": "Bengaluru Koramangala",
              Product: "Fine Gauge Cardigan",
              "Original Price": "₹3,499",
              "Clearance Price": "₹2,449",
              "Discount %": "30%",
              "Margin Impact": "-₹1,050 / unit",
            },
          ],
        },
      ],
      dataSources: [
        "Store inventory by size from Extra Small to Double Extra Large",
        "Weekly store discount and sale price records",
        "Sales speed comparisons between light and heavy clothes",
      ],
      methodology:
        "We tracked which products had sales drop week after week and checked what sizes were left unsold.",
    },
  },
  "case-5": {
    reportTitle: "Out-of-stock items causing the biggest lost sales",
    reportDate: "September 2026",
    kpiStats: [
      { value: "₹8.6 Cr", label: "Lost Sales" },
      { value: "71.2%", label: "Common Sizes in Stock" },
      { value: "4,120", label: "Failed Searches" },
      { value: "88.0%", label: "Shoppers Who Left" },
    ],
    keyFinding:
      "Running out of Medium and Large sizes in Rain Jackets and White Oxford Shirts cost ₹8.6 Cr in lost sales.\n88% of shoppers who encountered out-of-stock sizes left without buying anything.\n4,120 high-intent customer search sessions failed directly due to core size breaks.",
    findingChart: {
      title: "Lost Revenue & Stockout Velocity Drop",
      subtitle: "High-intent customer demand unfulfilled due to size M & L stockouts",
      badge: "88% Exit Rate",
      type: "comparison",
      bars: [
        {
          label: "Waterproof Commuter Parka",
          value: 100,
          formattedValue: "↓ 100%",
          subtext: "Complete stockout in sizes M & L",
          color: "bg-rose-600",
          isWarning: true,
        },
        {
          label: "Classic White Oxford Shirt",
          value: 65,
          formattedValue: "↓ 65%",
          subtext: "Core size M stockout at flagships",
          color: "bg-rose-500",
          isWarning: true,
        },
        {
          label: "Performance Rain Shell",
          value: 50,
          formattedValue: "↓ 50%",
          subtext: "Size L stockout across online doors",
          color: "bg-amber-500",
          isWarning: true,
        },
        {
          label: "Tailored Travel Chino",
          value: 40,
          formattedValue: "↓ 40%",
          subtext: "Size 32 waist broken size run",
          color: "bg-amber-500",
          isWarning: true,
        },
      ],
      takeaway:
        "Sizes M & L ran out in downtown flagships causing ₹8.6 Cr in lost sales while 420 surplus units sat idle in suburbs.",
    },
    topProducts: [
      {
        product: "Waterproof Commuter Parka",
        inventory: "₹0.0 Cr",
        age: "0 in stock",
        salesTrend: "↓ 100%",
      },
      {
        product: "Classic White Oxford Shirt",
        inventory: "₹0.2 Cr",
        age: "Sizes M/L out",
        salesTrend: "↓ 65%",
      },
      {
        product: "Tailored Travel Chino",
        inventory: "₹0.4 Cr",
        age: "Size 32 out",
        salesTrend: "↓ 40%",
      },
      {
        product: "Performance Rain Shell",
        inventory: "₹0.1 Cr",
        age: "Size L out",
        salesTrend: "↓ 50%",
      },
    ],
    drivers: [
      { label: "Shipping delays from overseas (+15 days)", value: "₹4.4 Cr" },
      { label: "Underestimating demand for Medium/Large", value: "₹2.6 Cr" },
      { label: "Some stores have too much, others have none", value: "₹1.2 Cr" },
      { label: "No automatic transfer between nearby stores", value: "₹0.4 Cr" },
    ],
    insights: [
      {
        number: "01",
        headline: "Common sizes ran out",
        detail: "Sizes Medium and Large make up 78% of demand but were often out of stock.",
      },
      {
        number: "02",
        headline: "Shoppers bought from competitors",
        detail:
          "Over 4,100 online shoppers searched for these sizes, saw they were gone, and left.",
      },
      {
        number: "03",
        headline: "Suburban stores have extra stock",
        detail:
          "Nearby suburban stores have 420 extra pieces of the exact sizes that downtown stores need.",
      },
    ],
    businessImpact:
      "Shoppers who were ready to buy walked away empty-handed and bought from other brands instead.",
    focusAreas: [
      "Move 650 extra pieces from suburban stores to busy downtown shops",
      "Air-ship 2,000 emergency restock pieces to the main warehouse",
      "Order more Medium and Large sizes instead of equal amounts of every size",
    ],
    howAnswerFound: {
      summary:
        "We counted online searches for sold-out items and store requests for sizes that were missing.",
      analysis:
        "Analyzed 30 days of online out-of-stock search queries (4,120 failed search hits) and physical store missed-sale logs. We multiplied unfulfilled visits by the category conversion rate and average order value to calculate total uncaptured revenue of ₹8.60 Cr.",
      findings: [
        "Estimated Lost Sales: ₹8.60 Cr in uncaptured revenue due to stockouts in Medium and Large sizes.",
        "Failed High-Intent Searches: 4,120 customers searched specifically for out-of-stock sizes on the website and app.",
        "Bounce Rate: 88.0% of shoppers who encountered an out-of-stock message exited without purchasing an alternate item.",
        "Inventory Imbalance: 420 units of the missing sizes are sitting idle in suburban store stockrooms while downtown flagships are sold out.",
      ],
      evidenceDatasets: [
        {
          id: "c5-lost-demand",
          name: "Out-of-Stock Search Queries & Lost Demand Log",
          badge: "Demand Table",
          period: "Past 30 Days",
          totalSum: "₹8.60 Cr Lost Demand",
          recordCount: "4,120 Search Logs",
          sourceSystem: "E-Commerce Search Engine Logs",
          citationId: "CIT-2026-OOS-LOG",
          description:
            "Direct log of user search queries returning zero results for core garments and sizes.",
          columns: [
            "Search Query ID",
            "Timestamp",
            "Channel",
            "Searched SKU",
            "Size",
            "Stock Status",
            "Customer Action",
          ],
          rows: [
            {
              "Search Query ID": "SRCH-88219",
              Timestamp: "23 Sep 11:42",
              Channel: "Mobile App",
              "Searched SKU": "Waterproof Commuter Parka",
              Size: "M",
              "Stock Status": "0 In Stock",
              "Customer Action": "Abandoned Cart (Exit)",
            },
            {
              "Search Query ID": "SRCH-88204",
              Timestamp: "23 Sep 11:38",
              Channel: "Web Store",
              "Searched SKU": "Waterproof Commuter Parka",
              Size: "L",
              "Stock Status": "0 In Stock",
              "Customer Action": "Abandoned Cart (Exit)",
            },
            {
              "Search Query ID": "SRCH-88190",
              Timestamp: "23 Sep 11:29",
              Channel: "Mobile App",
              "Searched SKU": "Classic White Oxford Shirt",
              Size: "M",
              "Stock Status": "0 In Stock",
              "Customer Action": "Abandoned Cart (Exit)",
            },
            {
              "Search Query ID": "SRCH-88162",
              Timestamp: "23 Sep 11:15",
              Channel: "Web Store",
              "Searched SKU": "Tailored Travel Chino",
              Size: "32",
              "Stock Status": "0 In Stock",
              "Customer Action": "Viewed alternate, no buy",
            },
          ],
        },
        {
          id: "c5-store-variance",
          name: "Store-Level Stock Variance & Distribution",
          badge: "Store Stock Table",
          period: "As of Sep 23, 2026",
          totalSum: "420 Surplus Units",
          recordCount: "42 Stores",
          sourceSystem: "ERP Store Inventory Balances",
          citationId: "CIT-2026-STR-BAL",
          description: "Comparison of downtown flagship stockouts versus suburban excess holding.",
          columns: [
            "Store Code",
            "Store Name",
            "Location Type",
            "Parka Size M",
            "Parka Size L",
            "Oxford Shirt Size M",
            "Balance Status",
          ],
          rows: [
            {
              "Store Code": "STR-DL-01",
              "Store Name": "Delhi Connaught Flagship",
              "Location Type": "High-Footfall Downtown",
              "Parka Size M": "0 pcs (Stockout)",
              "Parka Size L": "0 pcs (Stockout)",
              "Oxford Shirt Size M": "0 pcs (Stockout)",
              "Balance Status": "Severe Deficit",
            },
            {
              "Store Code": "STR-MH-04",
              "Store Name": "Mumbai Palladium Flagship",
              "Location Type": "High-Footfall Downtown",
              "Parka Size M": "0 pcs (Stockout)",
              "Parka Size L": "0 pcs (Stockout)",
              "Oxford Shirt Size M": "0 pcs (Stockout)",
              "Balance Status": "Severe Deficit",
            },
            {
              "Store Code": "STR-UP-12",
              "Store Name": "Noida Sector 18 Store",
              "Location Type": "Suburban Mall",
              "Parka Size M": "140 pcs",
              "Parka Size L": "110 pcs",
              "Oxford Shirt Size M": "95 pcs",
              "Balance Status": "Excess Idle Stock",
            },
            {
              "Store Code": "STR-HR-08",
              "Store Name": "Gurugram CyberHub Store",
              "Location Type": "Suburban Hub",
              "Parka Size M": "85 pcs",
              "Parka Size L": "85 pcs",
              "Oxford Shirt Size M": "70 pcs",
              "Balance Status": "Excess Idle Stock",
            },
          ],
        },
        {
          id: "c5-replenishment-po",
          name: "Replenishment PO & Inbound Pipeline",
          badge: "Restock Table",
          period: "Inbound Pipeline",
          totalSum: "2,000 Units Expedited",
          recordCount: "4 Inbound POs",
          sourceSystem: "Inbound Freight Logistics",
          citationId: "CIT-2026-RPL-PIPE",
          description:
            "Emergency factory replenishment orders in transit to restore baseline availability.",
          columns: ["Shipment PO", "Origin", "Destination Hub", "Units", "Mode", "ETA", "Status"],
          rows: [
            {
              "Shipment PO": "SHP-AIR-2026-19",
              Origin: "Hanoi Central Factory",
              "Destination Hub": "Delhi Central Distribution",
              Units: "1,200 pcs (Parkas M/L)",
              Mode: "Expedited Air Cargo",
              ETA: "26 Sep 2026",
              Status: "In Flight",
            },
            {
              "Shipment PO": "SHP-AIR-2026-22",
              Origin: "Dhaka Weaving Facility",
              "Destination Hub": "Mumbai Distribution Center",
              Units: "800 pcs (Oxford Shirts)",
              Mode: "Expedited Air Cargo",
              ETA: "27 Sep 2026",
              Status: "Customs Clearance",
            },
          ],
        },
      ],
      dataSources: [
        "Online searches that showed 'Out of Stock' results",
        "Store assistant notes on sizes customers asked for but could not buy",
        "Stock counts at every shop showing where extra pieces sit",
      ],
      methodology:
        "We multiplied the number of out-of-stock searches by our normal purchase rate to estimate how much money we lost.",
    },
  },
};

export function getDriverSummaryText(caseId?: string, reportTitle?: string): string {
  const normTitle = (reportTitle || "").toLowerCase();
  const id = (caseId || "").toLowerCase();

  if (id.includes("case-1") || normTitle.includes("exposure") || normTitle.includes("inventory")) {
    return "Inventory exposure is predominantly driven by slow-moving merchandise and aging inventory exceeding the 60-day turnover benchmark across 42 retail locations.";
  }
  if (id.includes("case-2") || normTitle.includes("launch") || normTitle.includes("newly")) {
    return "Launch underperformance is primarily driven by sizing return friction on cargo lines and misallocated ad spending away from fast-selling linen.";
  }
  if (
    id.includes("case-3") ||
    normTitle.includes("mill") ||
    normTitle.includes("revenue") ||
    normTitle.includes("dependent")
  ) {
    return "Supply chain vulnerability is driven by single-supplier concentration with a Coimbatore mill supplying over 78% of all denim yardage.";
  }
  if (
    id.includes("case-4") ||
    normTitle.includes("decline") ||
    normTitle.includes("lifecycle") ||
    normTitle.includes("markdown")
  ) {
    return "Margin dilution is driven by heavy clearance discounts and steady volume decline across aging knit polo collections sitting on store racks.";
  }
  if (id.includes("case-5") || normTitle.includes("stockout") || normTitle.includes("loss")) {
    return "Direct revenue loss is driven by acute stockouts in high-traffic downtown stores paired with delayed overseas freight replenishment.";
  }
  return "Exposure is driven by compounding inventory aging, declining unit sales velocity, and regional demand mismatches across core product categories.";
}

export interface AgentPlanItem {
  id: string;
  name: string;
  role: string;
  icon: string;
  /**
   * The instruction the orchestrator will send to this agent for THIS query.
   * It is what the user reads and edits in the plan card, so editing it has to
   * change what the agent is actually told — this is not a display blurb.
   *
   * Distinct from the catalog's stored `Prompt` column, which is the agent's
   * standing system prompt and never leaves the server.
   */
  runtimePrompt: string;
  isEnabled: boolean;
  isCustom?: boolean;
}

/**
 * A specialist the orchestrator thinks this question needs but that is not in
 * the standing roster. Opt-in: nothing runs until the user approves it.
 */
export interface SuggestedAgentItem {
  id: string;
  name: string;
  role: string;
  icon: string;
  /** One line on what this agent would do. */
  description: string;
  /**
   * The instruction this agent would be sent if approved. Editable, like
   * `AgentPlanItem.runtimePrompt` — the edited text is what gets sent.
   */
  runtimePrompt: string;
  /** Why this question needs a specialist that isn't already on the plan. */
  rationale?: string;
  /** User approval. Always starts false — the user opts in. */
  isApproved: boolean;
}

export const getDefaultAgentPlan = (query: string): AgentPlanItem[] => {
  const q = query.toLowerCase();
  if (q.includes("launch") || q.includes("newly") || q.includes("linen") || q.includes("cargo")) {
    return [
      {
        id: "sales-agent",
        name: "Sales Billing Agent",
        role: "Omnichannel POS & Web Invoices",
        icon: "🛍️",
        runtimePrompt:
          "Will ingest store sales receipts and e-commerce cart transactions across the initial 18-day launch window to benchmark sell-through velocity.",
        isEnabled: true,
      },
      {
        id: "returns-agent",
        name: "Returns & Fitment Agent",
        role: "Customer Ticket Reason Audit",
        icon: "🔄",
        runtimePrompt:
          "Will audit customer return tickets, exchange logs, and sizing feedback to detect fit or quality friction on lagging styles.",
        isEnabled: true,
      },
      {
        id: "marketing-agent",
        name: "Campaign ROI Agent",
        role: "Ad Budget vs Sell-Through Rate",
        icon: "📊",
        runtimePrompt:
          "Will evaluate digital marketing spend and ad impressions against footfall and conversions to measure promotional efficiency.",
        isEnabled: true,
      },
      {
        id: "executive-agent",
        name: "Allocation Strategy Agent",
        role: "Actionable Turnaround Playbook",
        icon: "👔",
        runtimePrompt:
          "Will formulate an actionable inventory strategy, detailing budget reallocation toward top sellers and clearance schedules for slow-moving lines.",
        isEnabled: true,
      },
    ];
  }

  // Default: Inventory Exposure & General Merchandising
  return [
    {
      id: "sales-agent",
      name: "Sales Billing Agent",
      role: "POS Invoices & Store Velocity",
      icon: "🛍️",
      runtimePrompt:
        "Will extract and analyze 90-day store billing transactions across all 42 retail doors to benchmark sell-through velocity and detect demand drop-offs.",
      isEnabled: true,
    },
    {
      id: "inventory-agent",
      name: "Inventory & Warehouse Agent",
      role: "Stock Aging & Depot Balances",
      icon: "📦",
      runtimePrompt:
        "Will scan central warehouse ledgers and store depot levels to flag SKUs with holding age >60 days and stock cover exceeding safe thresholds.",
      isEnabled: true,
    },
    {
      id: "finance-agent",
      name: "Finance & Exposure Agent",
      role: "Working Capital & Returns Deduction",
      icon: "💰",
      runtimePrompt:
        "Will calculate working capital tied up in slow-moving inventory and audit customer return deductions to quantify net financial exposure.",
      isEnabled: true,
    },
    {
      id: "executive-agent",
      name: "Executive Strategy Agent",
      role: "Synthesis & Turnaround Playbook",
      icon: "👔",
      runtimePrompt:
        "Will synthesize findings across all agent analyses into an executive turnaround plan with prioritized markdown timelines and stock redistribution.",
      isEnabled: true,
    },
  ];
};

export interface DataRepoItem {
  id: string;
  name: string;
  sourceType: string;
  /**
   * What the user sees, e.g. "Rakuten Stock Data". Shown instead of `name`,
   * which is the raw table identifier the orchestrator needs but which means
   * nothing to the user. Must distinguish rows: a channel alone repeats across
   * the stock/sales sources of the same channel.
   */
  label?: string;
  /** Sales channel this source belongs to, for grouping. */
  channel?: string;
  /**
   * Display-only metadata. Optional because the plan agent derives repos from
   * the catalog's DBAccess column, which carries neither value.
   */
  recordsCount?: string;
  lastSync?: string;
  isEnabled: boolean;
  isCustom?: boolean;
}

export const getDefaultDataRepos = (query: string): DataRepoItem[] => {
  const q = query.toLowerCase();
  if (q.includes("launch") || q.includes("newly") || q.includes("linen") || q.includes("cargo")) {
    return [
      {
        id: "repo-pos",
        name: "Omnichannel Store POS & Shopify Orders",
        sourceType: "First 18-day billing transactions (42 doors & web)",
        recordsCount: "148,290 bills",
        lastSync: "Today, 14:10",
        isEnabled: true,
      },
      {
        id: "repo-returns",
        name: "Returns & Customer Exchange Tickets",
        sourceType: "Customer service fitment & size ticket logs",
        recordsCount: "12,410 tickets",
        lastSync: "Today, 12:45",
        isEnabled: true,
      },
      {
        id: "repo-campaigns",
        name: "Meta & Google Ads Campaign Telemetry",
        sourceType: "Digital marketing impressions & spend by SKU",
        recordsCount: "64 ad sets",
        lastSync: "Today, 09:30",
        isEnabled: true,
      },
      {
        id: "repo-erp",
        name: "SAP Garment Warehouse Stock Ledger",
        sourceType: "Central depot dispatch & regional depot stock",
        recordsCount: "3,840 SKUs",
        lastSync: "Today, 06:00",
        isEnabled: true,
      },
    ];
  }

  return [
    {
      id: "repo-erp",
      name: "SAP Garment Warehouse Stock Ledger",
      sourceType: "Central depot dispatch & regional inventory ledgers",
      recordsCount: "18,420 SKUs",
      lastSync: "Today, 06:00",
      isEnabled: true,
    },
    {
      id: "repo-pos",
      name: "Omnichannel Store POS & Web Invoices",
      sourceType: "90-day store billing across 42 retail doors & online",
      recordsCount: "420,500 bills",
      lastSync: "Today, 14:10",
      isEnabled: true,
    },
    {
      id: "repo-wms",
      name: "WMS Inventory Aging & Valuation Tables",
      sourceType: "Aging ledgers (>60-90 days) & warehouse cost value",
      recordsCount: "42 categories",
      lastSync: "Today, 11:15",
      isEnabled: true,
    },
    {
      id: "repo-finance",
      name: "Finance ERP & Customer Returns Ledger",
      sourceType: "Working capital, credit notes & vendor chargebacks",
      recordsCount: "₹6.8 Cr reconciled",
      lastSync: "Today, 08:30",
      isEnabled: true,
    },
  ];
};

export interface GeminiMessageItem {
  id: string;
  query: string;
  timestamp: string;
  caseId: string;
  caseItem: ActiveCaseItem;
  structuredAnswer: CxoStructuredAnswer;
  isCopied?: boolean;
  addedToInbox?: boolean;
  feedback?: "up" | "down" | null;
  revealedSections?: number;
  agentPlan?: AgentPlanItem[];
  suggestedAgents?: SuggestedAgentItem[];
  dataRepos?: DataRepoItem[];
  customInstructions?: string;
}

export const getCaseDetailsForQuery = (query: string): GeminiMessageItem => {
  const lower = query.toLowerCase();
  let matchedId = "case-1";
  let matchedTitle = "Products are creating the highest inventory exposure";
  let matchedAgent = "Merchandising & Inventory Intelligence";
  let matchedBody =
    "Heavyweight wool overcoats and faux-shearling jackets hold ₹18.4 Cr in excess inventory across 42 products with 87 days average inventory age.";

  if (lower.includes("launch") || lower.includes("linen") || lower.includes("cargo")) {
    matchedId = "case-2";
    matchedTitle = "Newly launched products performing, and which ones need attention.";
    matchedAgent = "Product Performance & Launch Agent";
    matchedBody =
      "Spring Linen Blend shirts are at 84% full-price sell-through, while High-Rise Utility Cargo pants lag at 28% sell-through needing immediate promotional re-targeting.";
  } else if (
    lower.includes("revenue") ||
    lower.includes("share") ||
    lower.includes("denim") ||
    lower.includes("mill")
  ) {
    matchedId = "case-3";
    matchedTitle =
      "Generate the largest share of revenue, and how dependent is the business on them.";
    matchedAgent = "Revenue Cycle & Portfolio Agent";
    matchedBody =
      "Top 4 core denim lines drive 42.6% of monthly gross apparel revenue, posing high supplier concentration risk.";
  } else if (
    lower.includes("decline") ||
    lower.includes("lifecycle") ||
    lower.includes("markdown") ||
    lower.includes("polo")
  ) {
    matchedId = "case-4";
    matchedTitle =
      "Products are entering the decline stage of their lifecycle, and what actions should be considered";
    matchedAgent = "Lifecycle & Markdown Strategy Agent";
    matchedBody =
      "Merino knit polo shirts and thermal henleys show consecutive 35% MoM sales drops; recommended phased markdown from 20% to 40% clearance.";
  } else if (
    lower.includes("stockout") ||
    lower.includes("loss") ||
    lower.includes("demand") ||
    lower.includes("parka")
  ) {
    matchedId = "case-5";
    matchedTitle = "Stockouts caused the greatest loss in sales or customer demand";
    matchedAgent = "Supply Chain & Stockout Radar";
    matchedBody =
      "Size M and L stockouts in Waterproof Commuter Parkas and White Oxford Shirts resulted in ₹8.6 Cr lost demand across flagship stores and e-commerce.";
  }

  const caseItem: ActiveCaseItem = {
    age: "Just now",
    title: matchedTitle,
    body: matchedBody,
    isLive: true,
    agent: matchedAgent,
  };

  const baseAnswer = cxoStructuredAnswers[matchedId] || cxoStructuredAnswers["case-1"]!;
  let structuredAnswer = { ...baseAnswer };

  if (lower.includes("30 days") || lower.includes("last 30")) {
    structuredAnswer = {
      ...baseAnswer,
      reportTitle: `${baseAnswer.reportTitle} (Last 30 Days)`,
      reportDate: "24 Sep 2026",
      basedOnData: "based on the data form 25 aug 26 to 24 sep 26",
      kpiStats: [
        { value: "0.62 CR", label: "30-Day Exposure" },
        { value: "18", label: "Products" },
        { value: "4.1 L", label: "Top 10 Products" },
        { value: "34 Days", label: "Avg. Inventory Age" },
      ],
      keyFinding:
        "Over the last 30 days, inventory exposure reduced to ₹6.2 Cr across 18 high-velocity items.\nTop 10 items account for ₹4.1 Cr (66%) of recent locked capital.\nRecent replenishment shows improved turnover speed of 34 days.",
    };
  } else if (lower.includes("quarter") || lower.includes("q1")) {
    structuredAnswer = {
      ...baseAnswer,
      reportTitle: `${baseAnswer.reportTitle} (Q1 Historical Review)`,
      reportDate: "31 March 2026",
      basedOnData: "based on the data form 01 jan 26 to 31 march 26",
      kpiStats: [
        { value: "1.48 CR", label: "Q1 Exposure" },
        { value: "36", label: "Products" },
        { value: "9.4 L", label: "Top 10 Products" },
        { value: "76 Days", label: "Avg. Inventory Age" },
      ],
      keyFinding:
        "Full Q1 baseline recorded ₹14.8 Cr tied up in 36 products.\nTop 10 lines accounted for ₹9.4 Cr with an average age of 76 days.\nSeasonal transition at quarter-end initiated early markdown pressures.",
    };
  } else if (
    lower.includes("flagship") ||
    lower.includes("top 10 store") ||
    lower.includes("stores only")
  ) {
    structuredAnswer = {
      ...baseAnswer,
      reportTitle: `${baseAnswer.reportTitle} (Top 10 Flagship Doors)`,
      reportDate: "24 Sep 2026",
      basedOnData: "based on the data form Top 10 Metro Flagship Doors",
      kpiStats: [
        { value: "0.89 CR", label: "Flagship Exposure" },
        { value: "22", label: "Flagship Products" },
        { value: "6.3 L", label: "Top 10 Products" },
        { value: "52 Days", label: "Avg. Inventory Age" },
      ],
      keyFinding:
        "Top 10 metro flagships hold ₹8.9 Cr of total exposure across 22 styles.\nFootfall conversion in downtown flagships was 1.8x higher than suburban outlets.\nStock reallocation to suburban doors is recommended for extreme sizes.",
    };
  } else if (
    lower.includes("yoy") ||
    lower.includes("previous year") ||
    lower.includes("last year")
  ) {
    structuredAnswer = {
      ...baseAnswer,
      reportTitle: `${baseAnswer.reportTitle} (YoY Comparison)`,
      reportDate: "Sep 2025 vs Sep 2026",
      basedOnData: "based on the data form sep 25 to sep 26 (YoY)",
      kpiStats: [
        { value: "+14.2%", label: "YoY Exposure Increase" },
        { value: "42", label: "Affected Styles" },
        { value: "11.2 L", label: "Current Top 10" },
        { value: "+11 Days", label: "YoY Age Increase" },
      ],
      keyFinding:
        "Inventory exposure grew +14.2% YoY from ₹16.1 Cr in Sep 2025 to ₹18.4 Cr currently.\nAverage inventory shelf age extended by +11 days compared to the same period last year.\nDenim and outerwear drive 72% of the year-over-year increase.",
    };
  }

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    query,
    timestamp: "Just now",
    caseId: matchedId,
    caseItem,
    structuredAnswer,
    agentPlan: getDefaultAgentPlan(query),
    dataRepos: getDefaultDataRepos(query),
    customInstructions: "",
  };
};

export const initialActiveCases: ActiveCaseItem[] = [
  {
    age: "Just now",
    title: "Products are creating the highest inventory exposure",
    body: "Heavyweight wool overcoats and faux-shearling jackets hold $420,000 in excess inventory with 68 days of supply remaining past seasonal peak.",
    isLive: false,
    agent: "Merchandising & Inventory Intelligence",
  },
  {
    age: "1 hr ago",
    title: "Newly launched products performing, and which ones need attention.",
    body: "Spring Linen Blend shirts are at 84% full-price sell-through, while High-Rise Utility Cargo pants lag at 28% sell-through needing immediate promotional re-targeting.",
    isLive: true,
    agent: "Product Performance & Launch Agent",
  },
  {
    age: "3 hrs ago",
    title: "Generate the largest share of revenue, and how dependent is the business on them.",
    body: "Top 4 core denim lines (Slim Stretch & Relaxed Vintage) drive 42.6% of monthly gross apparel revenue, posing high supplier concentration risk.",
    isLive: false,
    agent: "Revenue Cycle & Portfolio Agent",
    newFindingsCount: 3,
  },
  {
    age: "5 hrs ago",
    title:
      "Products are entering the decline stage of their lifecycle, and what actions should be considered",
    body: "Merino knit polo shirts and thermal henleys show consecutive 35% MoM sales drops; recommended phased markdown from 20% to 40% clearance.",
    isLive: false,
    agent: "Lifecycle & Markdown Strategy Agent",
  },
  {
    age: "1 day ago",
    title: "Stockouts caused the greatest loss in sales or customer demand",
    body: "Size M and L stockouts in Waterproof Commuter Parkas and White Oxford Shirts resulted in $86,400 in lost demand across flagship stores and e-commerce.",
    isLive: true,
    agent: "Supply Chain & Stockout Radar",
  },
];

export interface SuggestedCase {
  id: string;
  category: "Inventory" | "Merchandising" | "Revenue" | "Supply Chain";
  department: string;
  title: string;
  description: string;
  impactMetric: string;
  severity: "High" | "Medium" | "Low";
  signal: string;
}

const suggestedCasesList: SuggestedCase[] = [
  {
    id: "sug-1",
    category: "Inventory",
    department: "Outerwear & Tailoring",
    title: "Overcoat Excess Inventory in Warm Regional Stores",
    description:
      "Southern distribution hubs holding 82% of double-breasted wool overcoats with negligible sell-through.",
    impactMetric: "$165,600 trapped cash",
    severity: "High",
    signal: "Detected 1 hr ago",
  },
  {
    id: "sug-2",
    category: "Merchandising",
    department: "Woven Tops & Shirts",
    title: "Spring Linen Velocity Surge & Stockout Threat",
    description:
      "Band-collar linen shirts trending 3.2x above initial sales forecasts with stock depletion in 7 days.",
    impactMetric: "+$94,000 revenue upside",
    severity: "Medium",
    signal: "Detected 3 hrs ago",
  },
  {
    id: "sug-3",
    category: "Revenue",
    department: "Denim & Bottoms",
    title: "Single-Mill Yarn Reliance in Core Stretch Denim",
    description:
      "78.5% of raw fabric supplied by Coimbatore spinning mill posing bottleneck risk for top denim lines.",
    impactMetric: "$1.28M monthly exposure",
    severity: "High",
    signal: "Detected yesterday",
  },
  {
    id: "sug-4",
    category: "Supply Chain",
    department: "Omnichannel Logistics",
    title: "Size Break Stockout in Metropolitan Flagships",
    description:
      "Sizes Medium and Large in commuter parkas out of stock across New York and Chicago flagship doors.",
    impactMetric: "-$86,400 unfulfilled demand",
    severity: "High",
    signal: "Detected 2 hrs ago",
  },
  {
    id: "sug-5",
    category: "Merchandising",
    department: "Knitwear & Basics",
    title: "Decline Stage Clearance for Heavy Thermal Waffles",
    description:
      "Customer purchasing shifted to lightweight modal knits; 8,420 thermal henley units idling.",
    impactMetric: "$52,000 cash recovery",
    severity: "Medium",
    signal: "Detected 4 hrs ago",
  },
];

const SUGGESTED_CATEGORIES = [
  { id: "All", label: "All Categories" },
  { id: "Inventory", label: "Inventory" },
  { id: "Merchandising", label: "Merchandising" },
  { id: "Revenue", label: "Revenue" },
  { id: "Supply Chain", label: "Supply Chain" },
] as const;

export interface AIAgentOption {
  id: string;
  name: string;
  category: "Inventory" | "Merchandising" | "Revenue" | "Supply Chain";
  role: string;
  icon: React.ElementType;
  color: string;
  status: string;
}

export const AVAILABLE_AGENTS: AIAgentOption[] = [
  {
    id: "inventory",
    name: "Merchandising & Inventory Intelligence",
    category: "Inventory",
    role: "Days of supply, seasonal exposure, dead stock liquidation & warehouse allocation",
    icon: Package,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    status: "Active • Model v2.4",
  },
  {
    id: "launch",
    name: "Product Performance & Launch Agent",
    category: "Merchandising",
    role: "Sell-through velocity, new silhouette diagnostics, return rate audits & ad reallocation",
    icon: Sparkles,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    status: "Active • Model v3.1",
  },
  {
    id: "revenue",
    name: "Revenue Cycle & Portfolio Agent",
    category: "Revenue",
    role: "Core revenue SKU concentration, supplier mill dependency & margin protection",
    icon: DollarSign,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    status: "Active • Model v2.2",
  },
  {
    id: "lifecycle",
    name: "Lifecycle & Markdown Strategy Agent",
    category: "Merchandising",
    role: "Decline stage SKU detection, clearance scheduling, AUR preservation & outlet offloading",
    icon: Layers,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    status: "Active • Model v2.8",
  },
  {
    id: "supply-chain",
    name: "Supply Chain & Stockout Radar",
    category: "Supply Chain",
    role: "Core sizing breaks, lost retail demand estimation, inter-store balancing & PO expedites",
    icon: ShoppingBag,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    status: "Active • Model v3.0",
  },
];

const suggestedQueries = [
  "Products creating highest inventory exposure",
  "New launch performance & items needing attention",
  "Top revenue generators & mill dependency",
  "Stockouts causing greatest loss in sales",
];

// Persistent state across navigation
let sharedCasesList: ActiveCaseItem[] = [...initialActiveCases];
let sharedPendingCase: ActiveCaseItem | null = null;
let sharedTriggerLoading: boolean = false;

const getInitialPending = (): { pendingCase: ActiveCaseItem | null; shouldLoad: boolean } => {
  if (sharedTriggerLoading && sharedPendingCase) {
    return { pendingCase: sharedPendingCase, shouldLoad: true };
  }
  try {
    const stored =
      typeof window !== "undefined" ? sessionStorage.getItem("pending_inbox_case") : null;
    if (stored) {
      const parsed = JSON.parse(stored) as ActiveCaseItem;
      sharedPendingCase = parsed;
      sharedTriggerLoading = true;
      if (!sharedCasesList.some((c) => c.title === parsed.title)) {
        sharedCasesList = [parsed, ...sharedCasesList];
      }
      return { pendingCase: parsed, shouldLoad: true };
    }
  } catch {
    // Ignore an invalid saved case and leave the inbox unchanged.
  }
  return { pendingCase: null, shouldLoad: false };
};

const PENDING_REPORT_SESSION_KEY = "astyle_pending_report_session";
const PENDING_ANALYSIS_KEY = "astyle_pending_analysis";

type PendingAnalysis = {
  sessionId: string;
  mode: AnalysisMode;
  query: string;
};

function readPendingReportSession(): string | null {
  try {
    return typeof window === "undefined"
      ? null
      : sessionStorage.getItem(PENDING_REPORT_SESSION_KEY);
  } catch {
    return null;
  }
}

function readPendingAnalysis(): PendingAnalysis | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(PENDING_ANALYSIS_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    if (
      typeof value["sessionId"] !== "string" ||
      (value["mode"] !== "deep-insights" && value["mode"] !== "chat") ||
      typeof value["query"] !== "string"
    ) {
      return null;
    }
    return {
      sessionId: value["sessionId"],
      mode: value["mode"],
      query: value["query"],
    };
  } catch {
    return null;
  }
}

export function CxoDashboard({
  initialView = "chat",
  initialSessions = [],
  initialHistoryOpen = false,
}: {
  initialView?: "chat" | "inbox";
  /** Session history from the API. The sidebar has no other source. */
  initialSessions?: HistorySession[];
  initialHistoryOpen?: boolean;
}) {
  const navigate = useNavigate();

  // Active view: "chat" (Ask Astyle) or "inbox" (Inbox for CXO)
  const [activeView, setActiveView] = useState<"chat" | "inbox">(initialView);
  const [specialistsRefreshKey, setSpecialistsRefreshKey] = useState(0);

  // Sync state if initialView changes via route navigation
  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const switchView = (targetView: "chat" | "inbox") => {
    setActiveView(targetView);
    if (targetView === "chat") {
      navigate({ to: "/ask-ai", search: { history: undefined } });
    } else {
      setIsHistoryOpen(false);
      navigate({ to: "/specialists" });
    }
  };

  // Chat Page state
  const [chatQuery, setChatQuery] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConnectingAgents, setIsConnectingAgents] = useState(false);
  const [connectingStep, setConnectingStep] = useState(1);
  const [activeQuestion, setActiveQuestion] = useState("");

  // Gemini Chat session state on Home Page
  const [geminiMessages, setGeminiMessages] = useState<GeminiMessageItem[]>([]);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  /** The plan returned for the current run, or null before one arrives. */
  const [reportPlan, setReportPlan] = useState<ReportPlan | null>(null);
  const [chatAnswer, setChatAnswer] = useState<ChatAnswer | null>(null);
  /** The run we are waiting on a socket reply for, or null when idle. */
  const [pendingRun, setPendingRun] = useState<{
    sessionId: string;
    mode: AnalysisMode;
  } | null>(null);
  /**
   * Conversation id shared by every prompt in the current session. Null means
   * the next prompt opens a new session (`new_session: true`).
   */
  const runSessionIdRef = useRef<string | null>(null);
  /** First chat run may be returned under an id assigned by the workflow. */
  const provisionalChatSessionIdRef = useRef<string | null>(null);
  /** Only the first chat reply in a newly created session may rename it. */
  const firstChatTitleSessionIdRef = useRef<string | null>(null);
  const [streamingQuery, setStreamingQuery] = useState("");
  const [geminiLoadingStage, setGeminiLoadingStage] = useState(
    "Agent Sales is looking for data...",
  );
  const geminiTimersRef = useRef<NodeJS.Timeout[]>([]);
  const askAiHeroScrollRef = useRef<HTMLDivElement>(null);
  const conversationStreamRef = useRef<HTMLDivElement>(null);
  const activeTurnRef = useRef<HTMLDivElement>(null);
  const continueTurnRef = useRef<HTMLDivElement>(null);
  const lastChatScrollTopRef = useRef(0);
  const ignoreChatScrollUntilRef = useRef(0);
  const [showChatChrome, setShowChatChrome] = useState(true);
  const recentSectionRef = useRef<HTMLDivElement>(null);

  // Session History Sidebar state
  const [isHistoryOpen, setIsHistoryOpen] = useState(initialHistoryOpen);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionHistoryList, setSessionHistoryList] = useState<HistorySession[]>(initialSessions);
  const [pendingReportSessionId, setPendingReportSessionId] = useState<string | null>(
    readPendingReportSession,
  );
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(
    readPendingAnalysis,
  );
  const restoredPendingActivityRef = useRef(false);

  const markAnalysisLoading = useCallback((next: PendingAnalysis) => {
    setPendingAnalysis(next);
    try {
      sessionStorage.setItem(PENDING_ANALYSIS_KEY, JSON.stringify(next));
    } catch {
      // Session storage can be unavailable in private browsing; live state still works.
    }
  }, []);

  const clearAnalysisLoading = useCallback((sessionId?: string) => {
    const stored = readPendingAnalysis();
    if (
      sessionId !== undefined &&
      stored?.sessionId !== sessionId &&
      pendingAnalysis?.sessionId !== sessionId
    ) {
      return;
    }
    setPendingAnalysis(null);
    try {
      sessionStorage.removeItem(PENDING_ANALYSIS_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }, [pendingAnalysis]);

  const markReportLoading = (sessionId: string) => {
    setPendingReportSessionId(sessionId);
    try {
      sessionStorage.setItem(PENDING_REPORT_SESSION_KEY, sessionId);
    } catch {
      // Session storage can be unavailable in private browsing; live state still works.
    }
  };

  const clearReportLoading = (sessionId?: string) => {
    const stored = readPendingReportSession();
    if (sessionId !== undefined && stored !== sessionId) return;
    setPendingReportSessionId(null);
    try {
      sessionStorage.removeItem(PENDING_REPORT_SESSION_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  };

  const handleSelectSession = (session: HistorySession) => {
    setShowChatChrome(true);
    lastChatScrollTopRef.current = 0;
    ignoreChatScrollUntilRef.current = 0;
    setActiveSessionId(session.id);
    setGeminiMessages(session.messages);
    setActiveQuestion(session.title);
    setChatQuery("");
    setIsGeminiLoading(false);
    setPendingRun(null);
    pendingRunRef.current = null;
    provisionalChatSessionIdRef.current = null;
    firstChatTitleSessionIdRef.current = null;
    const pendingAnalysisForSession =
      pendingAnalysis?.sessionId === session.id
        ? pendingAnalysis
        : readPendingAnalysis()?.sessionId === session.id
          ? readPendingAnalysis()
          : null;
    setIsGeminiLoading(pendingAnalysisForSession !== null);
    setPendingRun(
      pendingAnalysisForSession === null
        ? null
        : { sessionId: session.id, mode: pendingAnalysisForSession.mode },
    );
    pendingRunRef.current =
      pendingAnalysisForSession === null
        ? null
        : { sessionId: session.id, mode: pendingAnalysisForSession.mode };
    setStreamingQuery(pendingAnalysisForSession?.query ?? "");
    const reportStillLoading =
      pendingReportSessionId === session.id || readPendingReportSession() === session.id;
    // Opening a session continues it, so follow-ups keep its id rather than
    // opening a new one.
    runSessionIdRef.current = session.id;
    setReportPlan(null);
    setContinueStage(reportStillLoading ? "starting" : "idle");
    setReport(null);
    setChatAnswer(null);
    setPastTurns([]);
    setOpenedSessionId(session.id);

    setIsLoadingConversations(true);
    void fetchConversations({ data: { sessionId: session.id } })
      .then((result) => {
        // The user may have clicked another session while this was in flight.
        if (runSessionIdRef.current !== result.sessionId) return;

        // Earlier live replies could leave the provisional "Answer" title in
        // the sidebar. The saved chat answer has the workflow's real title.
        if (session.title.trim().toLowerCase() === "answer") {
          const savedChat = [...result.entries].reverse().find((entry) => entry.kind === "chat");
          if (savedChat?.kind === "chat") {
            setSessionHistoryList((prev) =>
              prev.map((item) =>
                item.id === session.id ? { ...item, title: savedChat.title } : item,
              ),
            );
          }
        }

        // A plan the user never approved is not history — it is a question
        // still waiting on them. Lift the trailing one out of the transcript
        // so it reopens with its toggles, prompt edits and Continue button.
        const last = result.entries.at(-1);
        const pending =
          last !== undefined && last.kind === "plan" && !isApproved(last.approvedStatus)
            ? toReportPlan(safeParseJson(last.planJson), result.sessionId, last.conversationId)
            : null;

        const hasStoredResult = result.entries.some(
          (entry) => entry.kind === "plan" || entry.kind === "chat" || entry.kind === "report",
        );
        if (hasStoredResult && pendingAnalysisForSession !== null) {
          clearAnalysisLoading(result.sessionId);
          setIsGeminiLoading(false);
          setPendingRun(null);
          pendingRunRef.current = null;
          setStreamingQuery("");
        }

        const storedReport = result.entries.some((entry) => entry.kind === "report");
        if (storedReport) {
          clearReportLoading(result.sessionId);
          setContinueStage("idle");
        } else if (reportStillLoading) {
          // The report may still be running after the page was revisited.
          // Keep the loader visible until the stored report or socket event arrives.
          setContinueStage("starting");
        }

        if (pending !== null && last !== undefined) {
          setConversationEntries(result.entries.slice(0, -1));
          setReportPlan(pending);
          // The prompt bubble above the card: only when the session has no
          // user row of its own to supply it.
          if (last.kind === "plan" && last.showPrompt) setStreamingQuery(pending.prompt);
        } else if (!storedReport && reportStillLoading) {
          // The live report loader draws its own "Continue" bubble. Drop the
          // stored copy of that message so it isn't shown twice.
          setConversationEntries(dropTrailingContinue(result.entries));
        } else {
          setConversationEntries(result.entries);
        }
      })
      .catch((error: unknown) => {
        console.error("[conversations] could not load session", error);
        setConversationEntries([]);
      })
      .finally(() => {
        setIsLoadingConversations(false);
      });
  };

  const handleNewSession = () => {
    setShowChatChrome(true);
    lastChatScrollTopRef.current = 0;
    ignoreChatScrollUntilRef.current = 0;
    setIsHistoryOpen(false);
    setActiveSessionId(null);
    setGeminiMessages([]);
    setChatQuery("");
    setActiveQuestion("");
    setIsGeminiLoading(false);
    setPendingRun(null);
    pendingRunRef.current = null;
    provisionalChatSessionIdRef.current = null;
    firstChatTitleSessionIdRef.current = null;
    setStreamingQuery("");
    // Start clean: a new session must not inherit the opened session's id,
    // or its first prompt would continue the old conversation.
    runSessionIdRef.current = null;
    setContinueStage("idle");
    setReport(null);
    setChatAnswer(null);
    setOpenedSessionId(null);
    setConversationEntries([]);
    setReportPlan(null);
    setPastTurns([]);
  };

  const handleGoToAskAi = () => {
    const pendingAnalysisForSession = readPendingAnalysis();
    const pendingReportSession = readPendingReportSession();
    const pendingSessionId = pendingAnalysisForSession?.sessionId ?? pendingReportSession;
    const existingPendingSession =
      pendingSessionId === null
        ? undefined
        : sessionHistoryList.find((session) => session.id === pendingSessionId);
    const pendingSession =
      existingPendingSession ??
      (pendingSessionId === null
        ? undefined
        : {
            id: pendingSessionId,
            title: pendingAnalysisForSession?.query ?? "Report in progress",
            timestamp: "Just now",
            group: "Today" as const,
            summarySnippet: "",
            messages: [],
          });

    handleNewSession();
    if (pendingSession !== undefined) {
      if (existingPendingSession === undefined) {
        setSessionHistoryList((previous) => [pendingSession, ...previous]);
      }
      handleSelectSession(pendingSession);
      setIsHistoryOpen(false);
    }
    const resetScroll = () => {
      askAiHeroScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
      conversationStreamRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    resetScroll();
    requestAnimationFrame(resetScroll);
    void navigate({ to: "/ask-ai", search: { history: undefined } });
  };

  const sessionHistoryForRestoreRef = useRef(sessionHistoryList);
  sessionHistoryForRestoreRef.current = sessionHistoryList;
  const selectSessionForRestoreRef = useRef(handleSelectSession);
  selectSessionForRestoreRef.current = handleSelectSession;

  useEffect(() => {
    if (initialView !== "chat" || restoredPendingActivityRef.current) return;
    const pendingAnalysisForSession = readPendingAnalysis();
    const pendingReportSession = readPendingReportSession();
    const pendingSessionId = pendingAnalysisForSession?.sessionId ?? pendingReportSession;
    if (pendingSessionId === null) return;

    const session =
      sessionHistoryForRestoreRef.current.find((item) => item.id === pendingSessionId) ?? {
        id: pendingSessionId,
        title: pendingAnalysisForSession?.query ?? "Report in progress",
        timestamp: "Just now",
        group: "Today" as const,
        summarySnippet: "",
        messages: [],
    };
    restoredPendingActivityRef.current = true;
    selectSessionForRestoreRef.current(session);
    setIsHistoryOpen(false);
  }, [initialView]);

  /**
   * Delete a session for real. The sidebar has already confirmed with the
   * user; it keeps its dialog open until this resolves, so throwing on failure
   * is what tells them nothing was removed.
   *
   * The row is removed only after the backend agrees. Dropping it optimistically
   * would show the session gone and then bring it back on the next load.
   */
  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession({ data: { sessionId } });

    clearReportLoading(sessionId);

    setSessionHistoryList((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      handleNewSession();
    }
  };

  useEffect(() => {
    return () => {
      geminiTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const [isReportFormatMode, setIsReportFormatMode] = useState(true);
  const [logoRotation, setLogoRotation] = useState(0);
  const { language, setLanguage, t } = useLanguage();
  const currentUser = useCurrentUser();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const isToggleFirstMount = useRef(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;

    const closeLanguageMenu = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setIsLanguageMenuOpen(false);
        return;
      }
      if (
        event instanceof MouseEvent &&
        event.target instanceof Node &&
        languageMenuRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsLanguageMenuOpen(false);
    };

    document.addEventListener("mousedown", closeLanguageMenu);
    document.addEventListener("keydown", closeLanguageMenu);
    return () => {
      document.removeEventListener("mousedown", closeLanguageMenu);
      document.removeEventListener("keydown", closeLanguageMenu);
    };
  }, [isLanguageMenuOpen]);

  useEffect(() => {
    if (isToggleFirstMount.current) {
      isToggleFirstMount.current = false;
      return;
    }
    setLogoRotation((prev) => prev + 60);
  }, [isReportFormatMode]);

  // Multi-Agent Planning Customization State
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editedTaskText, setEditedTaskText] = useState<string>("");
  const [isAddingAgentMsgId, setIsAddingAgentMsgId] = useState<string | null>(null);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("");
  const [newAgentTask, setNewAgentTask] = useState("");
  const [collapsedPlanMap, setCollapsedPlanMap] = useState<Record<string, boolean>>({});

  // Data Repositories & Additional Instructions State
  const [isAddingRepoMsgId, setIsAddingRepoMsgId] = useState<string | null>(null);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoSource, setNewRepoSource] = useState("");
  const [instructionDraftMap, setInstructionDraftMap] = useState<Record<string, string>>({});

  const handleToggleAgent = (msgId: string, agentId: string) => {
    setGeminiMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const plan = m.agentPlan || getDefaultAgentPlan(m.query);
        const updatedPlan = plan.map((a) =>
          a.id === agentId ? { ...a, isEnabled: !a.isEnabled } : a,
        );
        return { ...m, agentPlan: updatedPlan };
      }),
    );
  };

  /**
   * Approve or un-approve a suggested specialist. Approving only marks it —
   * the run picks up approved suggestions when it is submitted.
   */
  /**
   * Replace a session's provisional title (the raw prompt) with the distilled
   * one from the plan agent. Called when a plan arrives over the socket.
   *
   * No-op for an unknown id or a blank title, so a malformed event cannot wipe
   * a title the user can already read.
   */
  const applySessionTitle = useCallback((sessionId: string, title: string) => {
    const next = title.trim();
    if (next === "") return;
    setSessionHistoryList((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, title: next } : session)),
    );
  }, []);

  // Plans arrive over the chat socket, not in the workflow's HTTP response.
  const { on: onSocketEvent } = useSocket();

  useEffect(() => {
    return onSocketEvent(REPORT_PLAN_EVENT, (raw) => {
      const plan = parseReportPlanEvent(raw);
      if (plan === null) return;

      // Ignore plans for other runs — the socket is per-user, not per-session.
      if (plan.sessionId !== runSessionIdRef.current) return;

      const waiting = pastTurnsRef.current.findIndex(
        (turn) => turn.awaitingPlan && turn.query === plan.prompt,
      );
      if (waiting !== -1) {
        clearAnalysisLoading(plan.sessionId);
        setPastTurns((prev) =>
          prev.map((turn, index) =>
            index === waiting ? { ...turn, plan, awaitingPlan: false } : turn,
          ),
        );
        if (plan.sessionTitle !== undefined) {
          applySessionTitle(plan.sessionId, plan.sessionTitle);
        }
        return;
      }

      clearAnalysisLoading(plan.sessionId);
      setReportPlan(plan);
      setIsGeminiLoading(false);
      setPendingRun(null);
      // `streamingQuery` deliberately survives: it is the user's message, and
      // it stays above the plan that answers it.

      if (plan.sessionTitle !== undefined) {
        applySessionTitle(plan.sessionId, plan.sessionTitle);
      }
    });
  }, [onSocketEvent, applySessionTitle, clearAnalysisLoading]);

  useEffect(() => {
    return onSocketEvent(CHAT_RESPONSE_EVENT, (raw) => {
      const next = parseChatResponseEvent(raw);
      if (next === null) {
        console.warn("[chat] received an unreadable response");
        return;
      }

      const pending = pendingRunRef.current;
      if (next.sessionId !== runSessionIdRef.current) {
        // A new-session workflow may assign its own id instead of echoing the
        // provisional one we sent. Adopt it so this answer and follow-ups use
        // the id that the workflow actually stored.
        if (
          pending?.mode !== "chat" ||
          provisionalChatSessionIdRef.current !== runSessionIdRef.current ||
          sessionHistoryListRef.current.some((session) => session.id === next.sessionId)
        ) {
          console.warn("[chat] response belongs to another session", next.sessionId);
          return;
        }
        const provisionalId = provisionalChatSessionIdRef.current;
        runSessionIdRef.current = next.sessionId;
        provisionalChatSessionIdRef.current = null;
        if (firstChatTitleSessionIdRef.current === provisionalId) {
          firstChatTitleSessionIdRef.current = next.sessionId;
        }
        setActiveSessionId((id) => (id === provisionalId ? next.sessionId : id));
        setSessionHistoryList((prev) =>
          prev.map((session) =>
            session.id === provisionalId ? { ...session, id: next.sessionId } : session,
          ),
        );
        pendingRunRef.current = { ...pending, sessionId: next.sessionId };
        setPendingRun((current) =>
          current === null ? null : { ...current, sessionId: next.sessionId },
        );
      } else {
        provisionalChatSessionIdRef.current = null;
      }

      if (firstChatTitleSessionIdRef.current === next.sessionId) {
        applySessionTitle(next.sessionId, next.title);
        firstChatTitleSessionIdRef.current = null;
      }

      // The event identifies a session but not a prompt. If another prompt was
      // sent before this answer arrived, finish the oldest waiting chat turn.
      const waiting = pastTurnsRef.current.findIndex((turn) => turn.awaitingChat);
      if (waiting !== -1) {
        clearAnalysisLoading(next.sessionId);
        setPastTurns((prev) =>
          prev.map((turn, index) =>
            index === waiting ? { ...turn, chatAnswer: next, awaitingChat: false } : turn,
          ),
        );
        return;
      }

      if (pending?.mode !== "chat") return;
      clearAnalysisLoading(next.sessionId);
      setChatAnswer(next);
      setIsGeminiLoading(false);
      setPendingRun(null);
      pendingRunRef.current = null;
    });
  }, [onSocketEvent, applySessionTitle, clearAnalysisLoading]);

  // The finished report arrives the same way the plan does.
  useEffect(() => {
    return onSocketEvent(REPORT_EVENT, (raw) => {
      const next = parseReportEvent(raw);
      if (next === null) return;

      // The socket is per-user, not per-session.
      if (next.sessionId !== runSessionIdRef.current) return;

      // Prefer the plan id when two reports in this session are in flight.
      // Older payloads without one fall back to the last waiting turn.
      const waitingById = pastTurnsRef.current.findIndex(
        (turn) =>
          turn.awaitingReport &&
          next.conversationId !== undefined &&
          turn.plan?.conversationId === next.conversationId,
      );
      const waiting =
        waitingById !== -1
          ? waitingById
          : continueStageRef.current === "idle"
            ? pastTurnsRef.current.map((turn) => turn.awaitingReport).lastIndexOf(true)
            : -1;
      if (waiting !== -1) {
        clearReportLoading(next.sessionId);
        setPastTurns((prev) =>
          prev.map((turn, index) =>
            index === waiting ? { ...turn, report: next, awaitingReport: false } : turn,
          ),
        );
        return;
      }

      setReport(next);
      clearReportLoading(next.sessionId);
      // The report is the answer to the Continue click, so the waiting state
      // it was driving ends here.
      setContinueStage("idle");
    });
  }, [onSocketEvent]);

  /**
   * How far along the Continue click is. Approved suggestions have to exist in
   * the catalog before the report can name them, so that call comes first and
   * the user is told it is happening rather than watching a generic spinner.
   */
  const [continueStage, setContinueStage] = useState<ContinueStage>("idle");
  /** How many specialists the Continue click is creating, for the loader. */
  const [creatingAgentCount, setCreatingAgentCount] = useState(0);
  /** The finished report, once it arrives over the socket. */
  const [report, setReport] = useState<Report | null>(null);
  /** Messages for the session the user opened from the sidebar. */
  const [conversationEntries, setConversationEntries] = useState<Array<ConversationEntry>>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  /**
   * The session opened from the sidebar. Tracked separately from the rows
   * because a session with no messages still has to show *something* — falling
   * back to the landing screen makes the click look like it did nothing.
   */
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null);
  /**
   * Turns sent earlier in this visit. A new prompt moves the live turn here so
   * it stays in place above the new one, instead of being overwritten.
   */
  const [pastTurns, setPastTurns] = useState<Array<PastTurn>>([]);
  // Mirrors for the socket handlers, which are registered once and would
  // otherwise read stale state.
  const continueStageRef = useRef<ContinueStage>("idle");
  continueStageRef.current = continueStage;
  const pastTurnsRef = useRef<Array<PastTurn>>([]);
  pastTurnsRef.current = pastTurns;
  const pendingRunRef = useRef(pendingRun);
  pendingRunRef.current = pendingRun;
  const sessionHistoryListRef = useRef(sessionHistoryList);
  sessionHistoryListRef.current = sessionHistoryList;

  const handleConversationScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const top = event.currentTarget.scrollTop;
    const change = top - lastChatScrollTopRef.current;
    lastChatScrollTopRef.current = top;
    if (top < 12) {
      setShowChatChrome(true);
      return;
    }
    // Collapsing the header changes the stream's height and can clamp its
    // scrollTop. Ignore that layout movement until the transition finishes.
    if (performance.now() < ignoreChatScrollUntilRef.current) return;
    if (change < -4) {
      setShowChatChrome(true);
      ignoreChatScrollUntilRef.current = performance.now() + 240;
    } else if (change > 4) {
      setShowChatChrome(false);
      ignoreChatScrollUntilRef.current = performance.now() + 240;
    }
  };

  // Open each new turn with its question and loader near the top of the chat.
  // The turn keeps the same wrapper when the loader becomes a plan or answer.
  useEffect(() => {
    if (pendingRun === null || !isGeminiLoading) return;
    const stream = conversationStreamRef.current;
    const turn = activeTurnRef.current;
    if (stream === null || turn === null) return;
    const frame = requestAnimationFrame(() => {
      const top =
        turn.getBoundingClientRect().top -
        stream.getBoundingClientRect().top +
        stream.scrollTop -
        16;
      lastChatScrollTopRef.current = Math.max(0, top);
      ignoreChatScrollUntilRef.current = performance.now() + 240;
      stream.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingRun, isGeminiLoading]);

  // "Continue" also starts a visible loading turn below the plan.
  useEffect(() => {
    if (continueStage === "idle") return;
    const stream = conversationStreamRef.current;
    const turn = continueTurnRef.current;
    if (stream === null || turn === null) return;
    const frame = requestAnimationFrame(() => {
      const top =
        turn.getBoundingClientRect().top -
        stream.getBoundingClientRect().top +
        stream.scrollTop -
        16;
      lastChatScrollTopRef.current = Math.max(0, top);
      ignoreChatScrollUntilRef.current = performance.now() + 240;
      stream.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [continueStage]);

  // Open a saved session at the heading of its latest answer, plan, or report.
  useEffect(() => {
    if (openedSessionId === null || isLoadingConversations || pendingRunRef.current !== null)
      return;
    const stream = conversationStreamRef.current;
    if (stream === null) return;
    const frame = requestAnimationFrame(() => {
      const cards = stream.querySelectorAll<HTMLElement>(
        "[data-report-card], [data-report-plan-card], [data-chat-answer-card]",
      );
      const latestCard = cards.item(cards.length - 1);
      const top =
        latestCard === null
          ? Math.max(0, stream.scrollHeight - stream.clientHeight)
          : Math.max(
              0,
              latestCard.getBoundingClientRect().top -
                stream.getBoundingClientRect().top +
                stream.scrollTop -
                16,
            );
      lastChatScrollTopRef.current = top;
      ignoreChatScrollUntilRef.current = performance.now() + 240;
      stream.scrollTo({ top, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [openedSessionId, conversationEntries, isLoadingConversations]);

  const handleEditPlanAgentPrompt = useCallback((agentId: string, text: string) => {
    setReportPlan((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            agents: prev.agents.map((a) => (a.id === agentId ? { ...a, runtimePrompt: text } : a)),
          },
    );
  }, []);

  const handleEditSuggestedPrompt = useCallback((agentId: string, text: string) => {
    setReportPlan((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            suggestedAgents: prev.suggestedAgents.map((a) =>
              a.id === agentId ? { ...a, runtimePrompt: text } : a,
            ),
          },
    );
  }, []);

  /**
   * Hand the approved plan back for execution.
   *
   * Only what the user left switched on is sent, with whatever edits they made
   * to the instructions — the plan as displayed, not as originally proposed.
   */
  const handleContinuePlan = useCallback(() => {
    if (reportPlan === null) return;

    // The workflow runs one specific stored plan; without its row id there is
    // nothing to continue.
    if (reportPlan.conversationId === undefined) {
      console.error("[plan] cannot continue: the plan carries no conversation id");
      return;
    }

    const conversationId = reportPlan.conversationId;
    markReportLoading(reportPlan.sessionId);
    const rosterAgents = reportPlan.agents
      .filter((a) => a.isEnabled)
      .map(({ id, name, role, runtimePrompt }) => ({ id, name, role, runtimePrompt }));
    const approvedSuggestions = reportPlan.suggestedAgents.filter((a) => a.isApproved);

    const run = async () => {
      // Approved suggestions are not agents yet. Create them first, one call
      // each, and keep the runtime prompt the user edited — the creation
      // endpoint does not take it, but the report does.
      let newAgents: Array<{ id: string; name: string; role: string; runtimePrompt: string }> = [];

      if (approvedSuggestions.length > 0) {
        setCreatingAgentCount(approvedSuggestions.length);
        setContinueStage("creating-agents");

        const created = await createAgents({
          data: {
            agents: approvedSuggestions.map((agent) => ({
              suggestionId: agent.id,
              title: agent.name,
              category: agent.role,
              description: agent.description ?? "",
            })),
          },
        });

        newAgents = created.map((agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          runtimePrompt:
            approvedSuggestions.find((s) => s.id === agent.suggestionId)?.runtimePrompt ?? "",
        }));
      }

      setContinueStage("starting");

      await continueReport({
        data: {
          sessionId: reportPlan.sessionId,
          conversationId,
          prompt: reportPlan.prompt,
          planTitle: reportPlan.planTitle,
          planSummary: reportPlan.planSummary,
          sessionTitle: reportPlan.sessionTitle,
          customInstructions: reportPlan.customInstructions,
          // The ones just created join the roster; there is no longer anything
          // "suggested" about them.
          agents: [...rosterAgents, ...newAgents],
        },
      });
    };

    // The report itself comes back over the socket, so on success the button
    // stays disabled rather than flipping back and inviting a second run.
    void run().catch((error: unknown) => {
      console.error("[plan] could not start the report", error);
      clearReportLoading(reportPlan.sessionId);
      setContinueStage("idle");
    });
  }, [reportPlan]);

  const handleTogglePlanAgent = useCallback((agentId: string) => {
    setReportPlan((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            agents: prev.agents.map((a) =>
              a.id === agentId ? { ...a, isEnabled: !a.isEnabled } : a,
            ),
          },
    );
  }, []);

  const handleTogglePlanSuggested = useCallback((agentId: string) => {
    setReportPlan((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            suggestedAgents: prev.suggestedAgents.map((a) =>
              a.id === agentId ? { ...a, isApproved: !a.isApproved } : a,
            ),
          },
    );
  }, []);

  const handleToggleSuggestedAgent = (msgId: string, agentId: string) => {
    setGeminiMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const suggested = m.suggestedAgents ?? [];
        return {
          ...m,
          suggestedAgents: suggested.map((a) =>
            a.id === agentId ? { ...a, isApproved: !a.isApproved } : a,
          ),
        };
      }),
    );
  };

  const handleStartEditAgent = (agent: AgentPlanItem) => {
    setEditingAgentId(agent.id);
    setEditedTaskText(agent.runtimePrompt);
  };

  const handleSaveEditAgent = (msgId: string, agentId: string) => {
    setGeminiMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const plan = m.agentPlan || getDefaultAgentPlan(m.query);
        const updatedPlan = plan.map((a) =>
          a.id === agentId ? { ...a, runtimePrompt: editedTaskText.trim() || a.runtimePrompt } : a,
        );
        return { ...m, agentPlan: updatedPlan };
      }),
    );
    setEditingAgentId(null);
    setEditedTaskText("");
  };

  const handleAddCustomAgent = (msgId: string) => {
    if (!newAgentName.trim()) return;
    const newAgent: AgentPlanItem = {
      id: `custom-agent-${Date.now()}`,
      name: newAgentName.trim(),
      role: newAgentRole.trim() || "Custom Merchandising Task",
      icon: "⚡",
      runtimePrompt:
        newAgentTask.trim() ||
        `Will conduct specialized merchandising analysis as directed for ${newAgentName.trim()}.`,
      isEnabled: true,
      isCustom: true,
    };
    setGeminiMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const plan = m.agentPlan || getDefaultAgentPlan(m.query);
        return { ...m, agentPlan: [...plan, newAgent] };
      }),
    );
    setIsAddingAgentMsgId(null);
    setNewAgentName("");
    setNewAgentRole("");
    setNewAgentTask("");
  };

  const handleToggleDataRepo = (msgId: string, repoId: string) => {
    setGeminiMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const repos = m.dataRepos || getDefaultDataRepos(m.query);
        const updatedRepos = repos.map((r) =>
          r.id === repoId ? { ...r, isEnabled: !r.isEnabled } : r,
        );
        return { ...m, dataRepos: updatedRepos };
      }),
    );
  };

  const handleAddCustomRepo = (msgId: string) => {
    if (!newRepoName.trim()) return;
    const newRepo: DataRepoItem = {
      id: `custom-repo-${Date.now()}`,
      name: newRepoName.trim(),
      sourceType: newRepoSource.trim() || "Custom Enterprise Dataset",
      recordsCount: "Live Stream",
      lastSync: "Just now",
      isEnabled: true,
      isCustom: true,
    };
    setGeminiMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const repos = m.dataRepos || getDefaultDataRepos(m.query);
        return { ...m, dataRepos: [...repos, newRepo] };
      }),
    );
    setIsAddingRepoMsgId(null);
    setNewRepoName("");
    setNewRepoSource("");
  };

  const handleRerunWithCustomPlan = (msg: GeminiMessageItem) => {
    const activeAgents = (msg.agentPlan || getDefaultAgentPlan(msg.query)).filter(
      (a) => a.isEnabled,
    );
    const activeRepos = (msg.dataRepos || getDefaultDataRepos(msg.query)).filter(
      (r) => r.isEnabled,
    );
    const customInst = (instructionDraftMap[msg.id] ?? msg.customInstructions ?? "").trim();
    if (activeAgents.length === 0) return;

    setStreamingQuery(msg.query);
    setIsGeminiLoading(true);
    geminiTimersRef.current.forEach((t) => clearTimeout(t));
    geminiTimersRef.current = [];

    // Cycle through connecting data repositories first
    activeRepos.forEach((repo, idx) => {
      const t = setTimeout(() => {
        setGeminiLoadingStage(`Connecting data repository: ${repo.name}...`);
      }, idx * 350);
      geminiTimersRef.current.push(t);
    });

    const baseOffset = Math.max(activeRepos.length * 350, 400);

    // Then cycle through each active agent executing their assigned mandate
    activeAgents.forEach((agent, idx) => {
      const t = setTimeout(
        () => {
          setGeminiLoadingStage(
            `${agent.name} is executing: ${agent.runtimePrompt.slice(0, 52)}...`,
          );
        },
        baseOffset + idx * 600,
      );
      geminiTimersRef.current.push(t);
    });

    const totalDuration = baseOffset + activeAgents.length * 600 + 400;

    const tFinal = setTimeout(() => {
      setGeminiMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msg.id) return m;
          const instructionNote = customInst
            ? ` • Custom Instruction: "${customInst.slice(0, 48)}..."`
            : "";
          return {
            ...m,
            revealedSections: 7,
            customInstructions: customInst,
            structuredAnswer: {
              ...m.structuredAnswer,
              basedOnData: `Regenerated using ${activeAgents.length} agents across ${activeRepos.length} data repos${instructionNote}`,
            },
          };
        }),
      );
      setIsGeminiLoading(false);
      setStreamingQuery("");
    }, totalDuration);
    geminiTimersRef.current.push(tFinal);
  };
  const [expandedHowFound, setExpandedHowFound] = useState<Record<string, boolean>>({});
  const [openProductTable, setOpenProductTable] = useState<Record<string, boolean>>({});
  const [activeEvidenceDataset, setActiveEvidenceDataset] = useState<CxoEvidenceDataset | null>(
    null,
  );
  const [datasetSearchQuery, setDatasetSearchQuery] = useState("");
  const [datasetGroupBy, setDatasetGroupBy] = useState<string>("");
  const [datasetFilterCol, setDatasetFilterCol] = useState<string>("");
  const [datasetFilterVal, setDatasetFilterVal] = useState<string>("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Ask AI Chatbox inside Full Screen Dataset View
  const [datasetChatMessages, setDatasetChatMessages] = useState<
    {
      id: string;
      sender: "user" | "ai";
      content: string;
      timestamp: string;
    }[]
  >([]);
  const [datasetChatInput, setDatasetChatInput] = useState("");
  const [isDatasetChatLoading, setIsDatasetChatLoading] = useState(false);
  const datasetChatScrollRef = useRef<HTMLDivElement>(null);

  // Initialize dataset chat when a dataset is opened
  useEffect(() => {
    if (activeEvidenceDataset) {
      setDatasetChatMessages([
        {
          id: `ds-init-${Date.now()}`,
          sender: "ai",
          content: `I've opened the **${activeEvidenceDataset.name}** dataset (${activeEvidenceDataset.totalSum} across ${activeEvidenceDataset.recordCount}).\n\nYou can ask me to calculate totals, filter specific stores, summarize return reasons, or compare product numbers across this dataset.`,
          timestamp: "Just now",
        },
      ]);
      setDatasetChatInput("");
    }
  }, [activeEvidenceDataset?.id]);

  const handleSendDatasetChat = (userQuery: string) => {
    if (!userQuery.trim() || !activeEvidenceDataset) return;

    const userMsg = {
      id: `ds-user-${Date.now()}`,
      sender: "user" as const,
      content: userQuery,
      timestamp: "Just now",
    };

    setDatasetChatMessages((prev) => [...prev, userMsg]);
    setDatasetChatInput("");
    setIsDatasetChatLoading(true);

    setTimeout(() => {
      if (datasetChatScrollRef.current) {
        datasetChatScrollRef.current.scrollTop = datasetChatScrollRef.current.scrollHeight;
      }
    }, 50);

    setTimeout(() => {
      let aiResponse = "";
      const lower = userQuery.toLowerCase();
      const rows = activeEvidenceDataset.rows;

      if (lower.includes("store") || lower.includes("location") || lower.includes("where")) {
        aiResponse = `Analyzing store locations in this dataset:\n\n• Top billing was recorded at **Delhi Flagship (DL-01)** and **Mumbai Phoenix**, accounting for the largest transaction shares.\n• Suburban outlets show excess inventory units sitting with slower velocity compared to downtown high-footfall flagships.`;
      } else if (
        lower.includes("return") ||
        lower.includes("reason") ||
        lower.includes("fit") ||
        lower.includes("size")
      ) {
        aiResponse = `Customer returns and fit analysis for this dataset:\n\n• Sizing & Fit Issues: Represent **68%** of all logged return tickets, primarily focused on tight waist fits and sleeve lengths.\n• Top SKU affected: **Utility Cargo Pants** and **Men's Denim Jacket** recorded the highest return refund amounts (${activeEvidenceDataset.totalSum} total impact).`;
      } else if (
        lower.includes("sum") ||
        lower.includes("total") ||
        lower.includes("revenue") ||
        lower.includes("amount") ||
        lower.includes("cost")
      ) {
        aiResponse = `Financial data reconciliation:\n\n• Total Calculated Sum: **${activeEvidenceDataset.totalSum}**\n• Audited Record Count: **${activeEvidenceDataset.recordCount}**\n• Source System: **${activeEvidenceDataset.sourceSystem}**\n\nAll aggregated entries reconcile 100% with the high-level executive report.`;
      } else if (
        lower.includes("highest") ||
        lower.includes("top") ||
        lower.includes("outlier") ||
        lower.includes("worst") ||
        lower.includes("trend")
      ) {
        const firstRow = rows[0];
        const productKey =
          Object.keys(firstRow || {}).find(
            (k) => k.toLowerCase().includes("product") || k.toLowerCase().includes("style"),
          ) || "Product";
        const topItem = firstRow ? firstRow[productKey] : "Core item";
        aiResponse = `Key outlier identified in this dataset:\n\n• The single largest driver is **${topItem}**, representing the highest exposure in the sample records.\n• Recommended immediate action: Review safety stock buffer and reallocate inventory to high-velocity doors.`;
      } else {
        aiResponse = `Based on the **${activeEvidenceDataset.name}** records:\n\n• Audited timeframe: ${activeEvidenceDataset.period}\n• Total verified sum: **${activeEvidenceDataset.totalSum}** across ${activeEvidenceDataset.recordCount}.\n• Findings confirm that exposure is concentrated in slow-moving categories with below-normal sales velocity.`;
      }

      const aiMsg = {
        id: `ds-ai-${Date.now()}`,
        sender: "ai" as const,
        content: aiResponse,
        timestamp: "Just now",
      };

      setDatasetChatMessages((prev) => [...prev, aiMsg]);
      setIsDatasetChatLoading(false);

      setTimeout(() => {
        if (datasetChatScrollRef.current) {
          datasetChatScrollRef.current.scrollTop = datasetChatScrollRef.current.scrollHeight;
        }
      }, 60);
    }, 600);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeEvidenceDataset) {
        setActiveEvidenceDataset(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEvidenceDataset]);

  const uniqueFilterValues = useMemo(() => {
    if (!activeEvidenceDataset || !datasetFilterCol) return [];
    const set = new Set<string>();
    activeEvidenceDataset.rows.forEach((row) => {
      const val = row[datasetFilterCol];
      if (val !== undefined && val !== null && String(val).trim()) {
        set.add(String(val).trim());
      }
    });
    return Array.from(set).sort();
  }, [activeEvidenceDataset, datasetFilterCol]);

  const filteredEvidenceRows = useMemo(() => {
    if (!activeEvidenceDataset) return [];
    let rows = activeEvidenceDataset.rows;

    if (datasetFilterCol && datasetFilterVal) {
      rows = rows.filter((row) => String(row[datasetFilterCol] ?? "").trim() === datasetFilterVal);
    }

    if (datasetSearchQuery.trim()) {
      const q = datasetSearchQuery.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [activeEvidenceDataset, datasetSearchQuery, datasetFilterCol, datasetFilterVal]);

  const groupedEvidenceRows = useMemo(() => {
    if (!datasetGroupBy) return null;
    const groups: Record<string, Record<string, string>[]> = {};
    filteredEvidenceRows.forEach((row) => {
      const key = String(row[datasetGroupBy] ?? "Unassigned").trim() || "Unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [filteredEvidenceRows, datasetGroupBy]);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleExportCsv = (dataset: CxoEvidenceDataset) => {
    const header = dataset.columns.join(",");
    const rows = dataset.rows.map((row) =>
      dataset.columns.map((col) => `"${(row[col] ?? "").replace(/"/g, '""')}"`).join(","),
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${dataset.id}-evidence-audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleHowAnswerFound = (messageId: string) => {
    setExpandedHowFound((prev) => {
      const currentState = prev[messageId] !== false;
      return {
        ...prev,
        [messageId]: !currentState,
      };
    });
  };

  const handleToggleInbox = (messageId: string) => {
    setGeminiMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const nextState = !msg.addedToInbox;
          if (nextState) {
            sharedCasesList = [
              msg.caseItem,
              ...sharedCasesList.filter((c) => c.title !== msg.caseItem.title),
            ];
            setCasesList(sharedCasesList);
            setSuggestedNotice(`Added "${msg.caseItem.title}" to CXO Inbox`);
          }
          return { ...msg, addedToInbox: nextState };
        }
        return msg;
      }),
    );
  };

  const handleCopyAnswer = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setGeminiMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isCopied: true } : m)),
    );
    setTimeout(() => {
      setGeminiMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isCopied: false } : m)),
      );
    }, 2000);
  };

  const handleFeedback = (messageId: string, type: "up" | "down") => {
    setGeminiMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: m.feedback === type ? null : type } : m,
      ),
    );
  };

  const [casesList, setCasesList] = useState<ActiveCaseItem[]>(sharedCasesList);
  const [archivedCaseTitles, setArchivedCaseTitles] = useState<string[]>([]);
  const [lastArchivedNotice, setLastArchivedNotice] = useState<string | null>(null);

  const [isAddNewCaseOpen, setIsAddNewCaseOpen] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseAgent, setNewCaseAgent] = useState("Inventory Planning & Allocation");
  const [newCaseSummary, setNewCaseSummary] = useState("");

  const handleCreateNewCase = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newCaseTitle.trim() || `New Case: Merchandising Audit #${casesList.length + 1}`;
    const newCase: ActiveCaseItem = {
      title,
      age: "Just now",
      agent: newCaseAgent.trim() || "Inventory Planning & Allocation",
      body:
        newCaseSummary.trim() ||
        `Autonomous merchandising investigation initiated for ${title}. Live telemetry connectors synchronized across ERP and Store POS balances.`,
      isLive: true,
      newFindingsCount: 1,
    };
    sharedCasesList = [newCase, ...sharedCasesList.filter((c) => c.title !== title)];
    setCasesList(sharedCasesList);
    setSelectedActiveCase(newCase);
    setSelectedCaseIndex(0);
    setMobileActiveView("detail");
    setIsAddNewCaseOpen(false);
    setNewCaseTitle("");
    setNewCaseSummary("");
    setSuggestedNotice(`Created and opened new case: "${title}"`);
  };

  const archiveCase = (title: string) => {
    setArchivedCaseTitles((prev) => (prev.includes(title) ? prev : [...prev, title]));
    setLastArchivedNotice(title);
    setTimeout(() => {
      setLastArchivedNotice((curr) => (curr === title ? null : curr));
    }, 5000);
  };

  const restoreCase = (title: string) => {
    setArchivedCaseTitles((prev) => prev.filter((t) => t !== title));
    setLastArchivedNotice(null);
  };

  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [selectedSuggestedCategory, setSelectedSuggestedCategory] = useState<string>("All");
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [suggestedNotice, setSuggestedNotice] = useState<string | null>(null);

  const displayedCases = useMemo(() => {
    return casesList
      .filter((c) => !archivedCaseTitles.includes(c.title))
      .filter((c) => {
        if (selectedSuggestedCategory === "All") return true;
        const cat = selectedSuggestedCategory.toLowerCase();
        return (
          (c.agent && c.agent.toLowerCase().includes(cat)) ||
          c.title.toLowerCase().includes(cat) ||
          c.body.toLowerCase().includes(cat)
        );
      })
      .filter((c) => {
        if (!caseSearchQuery.trim()) return true;
        const q = caseSearchQuery.toLowerCase().trim();
        return (
          c.title.toLowerCase().includes(q) ||
          c.body.toLowerCase().includes(q) ||
          (c.agent && c.agent.toLowerCase().includes(q))
        );
      });
  }, [casesList, archivedCaseTitles, caseSearchQuery, selectedSuggestedCategory]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setIsCategoryFilterOpen(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const initialPendingInfo = getInitialPending();

  // Outlook selection state - default unselected unless a case is clicked or pending load
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(() => {
    if (initialPendingInfo.shouldLoad && initialPendingInfo.pendingCase) return 0;
    return -1;
  });
  const [selectedActiveCase, setSelectedActiveCase] = useState<ActiveCaseItem | null>(() => {
    if (initialPendingInfo.shouldLoad && initialPendingInfo.pendingCase)
      return initialPendingInfo.pendingCase;
    return null;
  });
  const [mobileActiveView, setMobileActiveView] = useState<"list" | "detail">(() => {
    if (initialPendingInfo.shouldLoad && initialPendingInfo.pendingCase) return "detail";
    return "list";
  });
  const [isCaseLoading, setIsCaseLoading] = useState<boolean>(() => {
    if (initialPendingInfo.shouldLoad && initialPendingInfo.pendingCase) return true;
    return false;
  });
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  // When inbox view is active and a case is pending auto-load, show loading then reveal result
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (activeView === "inbox") {
      const info = getInitialPending();
      if (info.shouldLoad && info.pendingCase) {
        const target = info.pendingCase;
        setSelectedActiveCase(target);
        setSelectedCaseIndex(0);
        setIsCaseLoading(true);
        setMobileActiveView("detail");

        timer = setTimeout(() => {
          setIsCaseLoading(false);
          sharedTriggerLoading = false;
          sharedPendingCase = null;
          try {
            sessionStorage.removeItem("pending_inbox_case");
          } catch {
            // Session storage can be unavailable; the in-memory case is cleared above.
          }
        }, 1200);
      }
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeView]);

  const handleSelectCase = (caseItem: ActiveCaseItem, index: number) => {
    if (selectedActiveCase?.title === caseItem.title && !isCaseLoading) {
      setMobileActiveView("detail");
      return;
    }

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }

    setIsCaseLoading(true);
    setSelectedActiveCase(caseItem);
    setSelectedCaseIndex(index);
    setMobileActiveView("detail");

    loadingTimerRef.current = setTimeout(() => {
      setIsCaseLoading(false);
      loadingTimerRef.current = null;
    }, 550);
  };

  const mapTitleToCaseId = (title: string, index: number) => {
    const t = title.toLowerCase();
    if (t.includes("fever") || t.includes("pediatric")) return "case-fever";
    if (t.includes("inventory exposure") || t.includes("exposure") || t.includes("overcoat"))
      return "case-1";
    if (
      t.includes("newly launched") ||
      t.includes("launched") ||
      t.includes("linen") ||
      t.includes("cargo")
    )
      return "case-2";
    if (t.includes("largest share") || t.includes("revenue") || t.includes("denim"))
      return "case-3";
    if (
      t.includes("decline stage") ||
      t.includes("lifecycle") ||
      t.includes("markdown") ||
      t.includes("polo")
    )
      return "case-4";
    if (t.includes("stockout") || t.includes("loss in sales") || t.includes("demand"))
      return "case-5";
    return `case-${((index >= 0 ? index : 0) % 5) + 1}`;
  };

  const currentCaseId = useMemo(() => {
    if (!selectedActiveCase) return "case-1";
    return mapTitleToCaseId(selectedActiveCase.title, selectedCaseIndex);
  }, [selectedActiveCase, selectedCaseIndex]);

  // Handler for asking a question: implements Gemini behavior right on the home page
  const handleAskQuestion = (rawQuery?: string) => {
    const q = (rawQuery ?? chatQuery).trim();
    if (!q) return;

    setActiveQuestion(q);
    setChatQuery("");
    setShowChatChrome(true);

    if (activeView === "inbox") {
      // In inbox view, load directly into inbox split-view
      const newMsg = getCaseDetailsForQuery(q);
      sharedCasesList = [
        newMsg.caseItem,
        ...sharedCasesList.filter((c) => c.title !== newMsg.caseItem.title),
      ];
      setCasesList(sharedCasesList);
      setSelectedActiveCase(newMsg.caseItem);
      setSelectedCaseIndex(0);
      setIsCaseLoading(true);
      setTimeout(() => {
        setIsCaseLoading(false);
      }, 600);
      return;
    }

    // Dispatch the run. The workflow answers over the chat socket, so there is
    // nothing to await here beyond the acknowledgement that it was sent.
    const mode: AnalysisMode = isReportFormatMode ? "deep-insights" : "chat";
    const isNewSession = runSessionIdRef.current === null;
    const runSessionId = runSessionIdRef.current ?? generateUUID();
    runSessionIdRef.current = runSessionId;
    if (mode === "chat" && isNewSession) {
      provisionalChatSessionIdRef.current = runSessionId;
      firstChatTitleSessionIdRef.current = runSessionId;
    }

    // Finish the visible turn before starting another one. Otherwise the new
    // loader is rendered above the old plan/report, and the old reply is lost.
    if (
      streamingQuery !== "" ||
      reportPlan !== null ||
      report !== null ||
      chatAnswer !== null ||
      isGeminiLoading
    ) {
      setPastTurns((prev) => [
        ...prev,
        {
          id: generateUUID(),
          query: streamingQuery,
          plan: reportPlan,
          report,
          chatAnswer,
          awaitingPlan: isGeminiLoading && pendingRun?.mode === "deep-insights",
          awaitingChat: isGeminiLoading && pendingRun?.mode === "chat",
          awaitingReport: continueStage !== "idle" && report === null,
          continueStage,
          creatingAgentCount,
        },
      ]);
    }
    setReportPlan(null);
    setReport(null);
    setChatAnswer(null);
    setContinueStage("idle");
    setStreamingQuery(q);
    const nextPendingRun = { sessionId: runSessionId, mode };
    pendingRunRef.current = nextPendingRun;
    setPendingRun(nextPendingRun);
    markAnalysisLoading({ sessionId: runSessionId, mode, query: q });
    setIsGeminiLoading(true);
    setChatQuery("");

    // Show the session in the sidebar straight away, titled with what the user
    // actually typed. The plan agent sends back a distilled `sessionTitle`,
    // which replaces this via applySessionTitle once the first plan lands.
    if (isNewSession) {
      setSessionHistoryList((prev) => [
        {
          id: runSessionId,
          title: q,
          timestamp: "Just now",
          group: "Today",
          summarySnippet: "",
          messages: [],
        },
        ...prev,
      ]);
      setActiveSessionId(runSessionId);
    }

    geminiTimersRef.current.forEach((t) => clearTimeout(t));
    geminiTimersRef.current = [];

    void startAnalysis({
      data: { mode, prompt: q, sessionId: runSessionId, newSession: isNewSession },
    }).catch((error: unknown) => {
      // Only a dispatch failure lands here; workflow timeouts are expected and
      // swallowed server-side. Without a dispatch there is no socket reply
      // coming, so stop waiting rather than spin forever.
      console.error("[analysis] could not dispatch run", error);
      clearAnalysisLoading(runSessionId);
      setIsGeminiLoading(false);
      setPendingRun(null);
      pendingRunRef.current = null;
      setStreamingQuery("");
    });
  };

  const handleVoiceModeClick = () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      return;
    }
    setIsVoiceActive(true);
    setChatQuery("Listening... 🎙️");
    setTimeout(() => {
      const spokenQuery = "Products are creating the highest inventory exposure";
      setChatQuery(spokenQuery);
      setIsVoiceActive(false);
      handleAskQuestion(spokenQuery);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 h-screen w-screen bg-surface-tint font-sans text-foreground flex overflow-hidden">
      {/* Light Theme Agent Loader */}
      {isConnectingAgents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl p-7 sm:p-8 text-center flex flex-col items-center space-y-5 text-slate-800 animate-in zoom-in-95 duration-200">
            {/* Animated Rotating Flower Logo */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute size-24 rounded-full bg-sky-400/20 blur-xl animate-pulse" />
              <div className="relative size-20 flex items-center justify-center">
                <img
                  src="/flower-logo.png"
                  alt="Loading..."
                  className="size-16 sm:size-18 object-contain animate-spin select-none"
                  style={{ animationDuration: "2.8s" }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-xs">
                <Check className="size-3 stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Connecting with the right agents...
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 italic line-clamp-2 px-3">
                "{activeQuestion}"
              </p>
            </div>

            {/* Progressive Connection Pipeline Steps (Light Theme) */}
            <div className="w-full space-y-2.5 text-left border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div
                  className={`size-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    connectingStep >= 1
                      ? "bg-emerald-500 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {connectingStep >= 1 ? (
                    <Check className="size-3 stroke-[3]" />
                  ) : (
                    <Loader2 className="size-3 animate-spin text-teal-600" />
                  )}
                </div>
                <span
                  className={connectingStep >= 1 ? "text-slate-800 font-medium" : "text-slate-400"}
                >
                  Analyzing apparel inventory & merchandising query...
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div
                  className={`size-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    connectingStep >= 2
                      ? "bg-emerald-500 text-white shadow-2xs"
                      : connectingStep === 1
                        ? "bg-sky-50 text-sky-600 border border-sky-300 ring-2 ring-sky-100"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {connectingStep >= 2 ? (
                    <Check className="size-3 stroke-[3]" />
                  ) : connectingStep === 1 ? (
                    <Loader2 className="size-3 animate-spin text-sky-600" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <span
                  className={
                    connectingStep >= 2
                      ? "text-slate-800 font-medium"
                      : connectingStep === 1
                        ? "text-slate-700 font-medium"
                        : "text-slate-400"
                  }
                >
                  Routing to Merchandising & Inventory Agents...
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div
                  className={`size-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    connectingStep >= 3
                      ? "bg-emerald-500 text-white shadow-2xs"
                      : connectingStep === 2
                        ? "bg-sky-50 text-sky-600 border border-sky-300 ring-2 ring-sky-100"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {connectingStep >= 3 ? (
                    <Check className="size-3 stroke-[3]" />
                  ) : connectingStep === 2 ? (
                    <Loader2 className="size-3 animate-spin text-sky-600" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <span
                  className={
                    connectingStep >= 3
                      ? "text-slate-800 font-medium"
                      : connectingStep === 2
                        ? "text-slate-700 font-medium"
                        : "text-slate-400"
                  }
                >
                  Synthesizing SKU sell-through, stock & store telemetry...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED NAVIGATION RAIL */}
      <nav
        aria-label="Main menu"
        className="flex w-14 md:w-[72px] shrink-0 flex-col items-center gap-2 pt-3.5 border-r border-border dark:border-zinc-800 overflow-visible bg-surface z-20"
      >
        {/* Brand Logo */}
        <button
          type="button"
          onClick={handleGoToAskAi}
          className="mb-1 grid size-10 place-items-center rounded-xl transition-colors hover:bg-tile cursor-pointer select-none"
          title="ASTYLE — Go to Chat"
          aria-label="ASTYLE"
        >
          <img src="/flower-logo.png" alt="ASTYLE" className="size-6 sm:size-7 object-contain" />
        </button>

        {/* Chat */}
        <div className="relative group flex items-center justify-center">
          <button
            type="button"
            onClick={handleGoToAskAi}
            aria-label="Chat"
            className={`relative grid size-12 place-items-center rounded-full transition-colors duration-200 cursor-pointer ${
              activeView === "chat" && !isHistoryOpen
                ? "bg-chip-active text-chip-active-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-tile"
            }`}
          >
            <MessageSquare className="size-5" />
          </button>
          <div className="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5">
            {t("nav.chat", { defaultValue: "Chat" })}
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
          </div>
        </div>

        {/* History */}
        <div className="relative group flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (activeView !== "chat") {
                void navigate({ to: "/ask-ai", search: { history: "open" } });
                return;
              }
              setIsHistoryOpen((open) => !open);
            }}
            aria-label={t("nav.chatHistory", { defaultValue: "Chat History" })}
            aria-expanded={activeView === "chat" && isHistoryOpen}
            aria-controls={activeView === "chat" && isHistoryOpen ? "ask-ai-session-history" : undefined}
            title={activeView === "chat" && isHistoryOpen ? t("nav.closeChatHistory", { defaultValue: "Close Chat History" }) : t("nav.openChatHistory", { defaultValue: "Open Chat History" })}
            className={`relative grid size-12 place-items-center rounded-full transition-colors duration-200 cursor-pointer ${
              activeView === "chat" && isHistoryOpen
                ? "bg-chip-active text-chip-active-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-tile"
            }`}
          >
            <History className="size-5" aria-hidden="true" />
          </button>
          <div className="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5">
            {t("nav.chatHistory", { defaultValue: "Chat History" })}
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
          </div>
        </div>

        {/* Specialists */}
        <div className="relative group flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setSpecialistsRefreshKey((key) => key + 1);
              switchView("inbox");
            }}
            aria-label="Specialists"
            className={`relative grid size-12 place-items-center rounded-full transition-colors duration-200 cursor-pointer ${
              activeView === "inbox"
                ? "bg-chip-active text-chip-active-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-tile"
            }`}
          >
            <UsersRound className="size-5" />
          </button>
          <div className="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5">
            {t("nav.specialists", { defaultValue: "Specialists" })}
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
          </div>
        </div>
      </nav>

      {/* Session History Sidebar (between Nav Rail and Workspace when on chat view) */}
      {activeView === "chat" && isHistoryOpen && (
        <SessionHistorySidebar
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          historySessions={sessionHistoryList}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {/* WORKSPACE AREA TO RIGHT OF RAIL */}
      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Minimal Header: Language Switcher & Profile */}
        <header
          className="absolute top-3 right-4 sm:right-6 z-30 flex items-center gap-2.5 pointer-events-auto"
          aria-label="User navigation"
        >
          {/* Language Switcher */}
          <div ref={languageMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsLanguageMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
              aria-label={t("header.chooseLanguage", { defaultValue: "Choose language" })}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/80 bg-surface/85 backdrop-blur-md px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:bg-surface hover:border-border hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
            >
              <Languages className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{language === "ja" ? "日本語" : "English"}</span>
              <ChevronDown
                className={`size-3 text-muted-foreground transition-transform duration-150 ${isLanguageMenuOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {isLanguageMenuOpen && (
              <div
                role="menu"
                aria-label="Language options"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-36 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-sm shadow-xl animate-in fade-in zoom-in-95 duration-150"
              >
                {[
                  { value: "en" as const, label: "English" },
                  { value: "ja" as const, label: "日本語" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === option.value}
                    onClick={() => {
                      setLanguage(option.value);
                      setIsLanguageMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium transition-colors cursor-pointer ${
                      language === option.value
                        ? "bg-chip-active text-chip-active-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span>{option.label}</span>
                    {language === option.value ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <div
            className="flex items-center gap-2 rounded-full border border-border/80 bg-surface/85 backdrop-blur-md py-1 pl-3 pr-1 shadow-2xs hover:shadow-xs transition-shadow"
            title={currentUser.email}
          >
            <span className="hidden sm:inline text-xs font-medium text-foreground select-none">
              {currentUser.name}
            </span>
            <span className="grid size-6 sm:size-6.5 place-items-center rounded-full bg-[oklch(0.68_0.15_55)] text-[11px] sm:text-xs font-semibold text-white shadow-2xs select-none">
              {currentUser.initial}
            </span>
          </div>
        </header>
          {activeView === "chat" ? (
            geminiMessages.length === 0 &&
            !isGeminiLoading &&
            reportPlan === null &&
            report === null &&
            chatAnswer === null &&
            pastTurns.length === 0 &&
            openedSessionId === null ? (
              /* ASK ASTYLE CHAT HERO VIEW */
              <div
                ref={askAiHeroScrollRef}
                className="subtle-scrollbar relative min-h-0 flex-1 snap-y snap-proximity scroll-smooth overflow-x-hidden overflow-y-auto bg-gradient-to-b from-[#eaf5f8] via-[#e4f1f5] to-[#def0f5] px-4 text-foreground"
              >
                {/* Subtle Ambient Radial Orbs contained inside */}
                <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-cyan-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-teal-200/35 blur-3xl" />

                <div className="relative z-10 flex min-h-full w-full snap-start flex-col items-center justify-center py-6">
                  <div
                    className={`w-full flex flex-col items-center text-center py-2 transition-all duration-300 ease-out ${
                      isSearchFocused || chatQuery.trim() ? "max-w-2xl sm:max-w-3xl" : "max-w-xl"
                    }`}
                  >
                    {/* Flower Logo above title */}
                    <div className="flex items-center justify-center mb-3 sm:mb-4 group">
                      <img
                        src="/flower-logo.png"
                        alt="Logo"
                        onClick={() => {
                          setLogoRotation((prev) => prev + 60);
                          handleGoToAskAi();
                        }}
                        style={{ transform: `rotate(${logoRotation}deg)` }}
                        className="size-16 sm:size-20 object-contain drop-shadow-sm select-none cursor-pointer transition-transform duration-500 ease-out hover:scale-105 active:scale-95"
                        title="A style — Go to Chat"
                      />
                    </div>

                    {/* Title: What should AI analyze? with bottom spacing */}
                    <h1
                      style={{ fontWeight: 400 }}
                      className="text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-[#142a38] leading-tight select-none mb-3 sm:mb-4"
                    >
                      {t("hero.title", { defaultValue: "What should AI analyze?" })}
                    </h1>

                    {/* Centered Search Card with Top-Docked Deep Insights / Chat Mode Toggle */}
                    <div className="w-full space-y-3.5 flex flex-col items-center">
                      {/* Mode Toggle Switch docked close on top of search box */}
                      <div className="relative z-20 -mb-2.5 sm:-mb-3">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white border border-slate-300 shadow-xs">
                          <button
                            type="button"
                            onClick={() => setIsReportFormatMode(true)}
                            className={`text-xs sm:text-sm transition-all cursor-pointer ${
                              isReportFormatMode
                                ? "font-semibold text-[#0e7490]"
                                : "font-normal text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {t("hero.deepInsights", { defaultValue: "Deep Insights" })}
                          </button>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={!isReportFormatMode}
                            onClick={() => setIsReportFormatMode((prev) => !prev)}
                            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-slate-200 border border-slate-300 transition-colors duration-200 ease-in-out focus:outline-hidden"
                            title={
                              isReportFormatMode ? t("hero.switchToChat", { defaultValue: "Switch to Chat Mode" }) : t("hero.switchToDeep", { defaultValue: "Switch to Deep Insights" })
                            }
                          >
                            <span
                              className={`pointer-events-none inline-block size-4 transform rounded-full bg-[#0e7490] shadow-sm transition duration-200 ease-in-out mt-px ${
                                isReportFormatMode ? "translate-x-0.5" : "translate-x-4"
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsReportFormatMode(false)}
                            className={`text-xs sm:text-sm transition-all cursor-pointer ${
                              !isReportFormatMode
                                ? "font-semibold text-[#0e7490]"
                                : "font-normal text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {t("hero.chatMode", { defaultValue: "Chat Mode" })}
                          </button>
                        </div>
                      </div>

                      <form
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsSearchFocused(false);
                          }
                        }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAskQuestion();
                        }}
                        className="w-full relative shadow-lg hover:shadow-xl rounded-2xl sm:rounded-full bg-white border-2 border-slate-300 hover:border-slate-400 focus-within:border-[#0e7490] focus-within:ring-4 focus-within:ring-[#0e7490]/20 flex items-center px-4 sm:px-5 py-2 sm:py-2.5 gap-3 transition-all ring-1 ring-black/5"
                      >
                        <Search className="size-5 text-[#0e7490] shrink-0 stroke-[2.2]" />
                        <input
                          type="text"
                          value={chatQuery}
                          onFocus={() => setIsSearchFocused(true)}
                          onClick={() => setIsSearchFocused(true)}
                          onChange={(e) => setChatQuery(e.target.value)}
                          placeholder={t("hero.inputPlaceholder", { defaultValue: "Ask anything (e.g. Products creating highest inventory exposure...)" })}
                          className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-none font-normal"
                        />
                        {chatQuery && (
                          <button
                            type="button"
                            onClick={() => setChatQuery("")}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition cursor-pointer"
                            aria-label="Clear search"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={!chatQuery.trim() && !isVoiceActive}
                          className="px-5 sm:px-6 py-2 rounded-xl sm:rounded-full bg-[#0e7490] hover:bg-[#0c627a] disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow active:scale-98 shrink-0"
                        >
                          {t("hero.analyze", { defaultValue: "Analyze" })}
                        </button>
                      </form>

                      {/* Voice Mode Pill Button - Filled Color with Bottom Spacing */}
                      {VOICE_MODE_ENABLED && (
                        <div className="flex items-center justify-center pb-2">
                          <button
                            type="button"
                            onClick={handleVoiceModeClick}
                            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer shadow-sm hover:shadow active:scale-98 ${
                              isVoiceActive
                                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                : "bg-[#0e7490] hover:bg-[#0c627a] text-white"
                            }`}
                          >
                            <Mic className="size-3.5 sm:size-4 text-white" />
                            <span>{isVoiceActive ? t("hero.listening", { defaultValue: "Listening..." }) : t("hero.voiceMode", { defaultValue: "Voice Mode" })}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Highly Readable Suggested Queries - Transparent Background */}
                    <div className="pt-6 sm:pt-8 w-full max-w-xl flex flex-col items-center gap-2.5">
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        {t("hero.suggestedQueries", { defaultValue: "Suggested Queries" })}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                        {suggestedQueries.map((query, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAskQuestion(query)}
                            className="px-4 py-2.5 rounded-2xl sm:rounded-full bg-transparent hover:bg-white/40 border border-slate-300 hover:border-[#0e7490]/60 text-xs sm:text-sm text-slate-800 hover:text-[#0e7490] transition cursor-pointer flex items-center gap-2.5 text-left group"
                          >
                            <Sparkles className="size-3.5 text-[#0e7490] shrink-0" />
                            <span className="leading-snug font-medium line-clamp-1">
                              <TranslatableText text={query} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      recentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    aria-label="Scroll to recent chats"
                    title="More below"
                    className="absolute bottom-3 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full border border-slate-300/80 bg-white/70 text-[#0e7490] shadow-xs transition hover:bg-white hover:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e7490]"
                  >
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <div
                  ref={recentSectionRef}
                  className="relative z-10 mx-auto min-h-full w-full max-w-xl snap-start pb-10 pt-8 text-left"
                >
                  <span className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("hero.recents", { defaultValue: "Recents" })}
                  </span>
                  {sessionHistoryList.length === 0 ? (
                    <p className="mt-2 text-center text-xs text-slate-500">{t("hero.noRecentChats", { defaultValue: "No recent chats yet" })}</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-1">
                      {sessionHistoryList.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => handleSelectSession(session)}
                          className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-[#0e7490]"
                        >
                          <History
                            className="size-3.5 shrink-0 text-[#0e7490]/70"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-700 group-hover:text-[#0e7490]">
                            <TranslatableText text={session.title} />
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {session.timestamp}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* GEMINI BEHAVIOR CONVERSATION STREAM ON HOME PAGE */
              <div className="relative flex min-h-0 flex-1 flex-col overflow-clip bg-gradient-to-b from-[#eaf5f8] via-[#e4f1f5] to-[#def0f5]">
                {/* Subtle Ambient Radial Orbs */}
                <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-cyan-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-teal-200/35 blur-3xl" />

                {/* Scrollable Conversation Stream */}
                <div
                  ref={conversationStreamRef}
                  onScroll={handleConversationScroll}
                  className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-14 sm:pt-16 pb-28 z-10"
                >
                  <div className="mx-auto max-w-[58rem] space-y-6 pb-6">
                    {/* Stored messages are always older than turns created in
                        this visit, including a follow-up to an opened session. */}
                    {openedSessionId !== null && (
                      <div className="mb-5">
                        <ConversationList
                          entries={conversationEntries}
                          isLoading={isLoadingConversations}
                        />
                      </div>
                    )}
                    {geminiMessages.map((msg) => (
                      <div
                        key={msg.id}
                        id={`msg-${msg.id}`}
                        className="space-y-4 animate-in fade-in duration-300"
                      >
                        {/* USER QUERY BUBBLE */}
                        <div className="flex justify-end">
                          <div className="max-w-xl rounded-2xl bg-white border border-slate-200/90 shadow-2xs px-4 py-2.5 text-slate-900 text-sm font-medium flex items-center gap-2.5">
                            <span><TranslatableText text={msg.query} /></span>
                            <div className="size-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                              <User className="size-3.5" />
                            </div>
                          </div>
                        </div>

                        {!isReportFormatMode ? (
                          <div className="flex items-start gap-3">
                            <div className="size-7 rounded-lg bg-[#0e7490] flex items-center justify-center shrink-0 text-white shadow-2xs mt-1">
                              <Sparkles className="size-4" />
                            </div>
                            <div className="flex-1 max-w-2xl rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 text-slate-800 text-sm space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="font-bold text-slate-900 text-base">
                                  <TranslatableText text={msg.structuredAnswer.reportTitle} />
                                </h3>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                <TranslatableText text={msg.structuredAnswer.keyFinding} />
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* GEMINI AI ASSISTANT ANSWER CARD - SECTION BY SECTION LOADING */}
                            {(() => {
                              const revealed = msg.revealedSections ?? 7;

                              return (
                                <>
                                  {/* MULTI-AGENT PLANNING & ORCHESTRATION CARD */}
                                  {(() => {
                                    const plan = msg.agentPlan || getDefaultAgentPlan(msg.query);
                                    const repos = msg.dataRepos || getDefaultDataRepos(msg.query);
                                    const isCollapsed = collapsedPlanMap[msg.id] ?? false;
                                    const activeCount = plan.filter((a) => a.isEnabled).length;
                                    const activeReposCount = repos.filter(
                                      (r) => r.isEnabled,
                                    ).length;
                                    const isAddingAgent = isAddingAgentMsgId === msg.id;
                                    const isAddingRepo = isAddingRepoMsgId === msg.id;

                                    return (
                                      <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-b from-white via-sky-50/20 to-white p-5 sm:p-7 shadow-2xs space-y-5 mb-5 animate-in fade-in duration-300">
                                        {/* Card Header - Clean Title */}
                                        <div className="border-b border-slate-200/70 pb-3">
                                          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                            {t("chat.reportPlan", { defaultValue: "Report Generation Plan" })}
                                          </h3>
                                          <p className="text-sm text-slate-600 mt-1 font-normal">
                                            {t("chat.planDescription", { defaultValue: "This plan outlines how specialized merchandising agents will analyze data and synthesize findings to generate your report." })}
                                          </p>
                                        </div>

                                        <div className="space-y-5 pt-1">
                                          {/* 1. AGENTS - SIMPLE LIST VIEW (Minimum 14px font size) */}
                                          <div className="space-y-2.5">
                                            <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                                              {plan.map((agent, index) => {
                                                const isEditing = editingAgentId === agent.id;

                                                return (
                                                  <div
                                                    key={agent.id}
                                                    className={`p-4 sm:p-5 transition-colors ${
                                                      agent.isEnabled
                                                        ? "bg-white hover:bg-slate-50/60"
                                                        : "bg-slate-50/50 opacity-60"
                                                    }`}
                                                  >
                                                    <div className="flex items-start justify-between gap-4">
                                                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 border border-slate-200 mt-0.5 select-none">
                                                          {String(index + 1).padStart(2, "0")}
                                                        </span>
                                                        <div className="min-w-0 flex-1 space-y-1.5">
                                                          <div className="flex items-center gap-2.5 flex-wrap">
                                                            <h4 className="text-base font-bold text-slate-900">
                                                              <TranslatableText text={agent.name} />
                                                            </h4>
                                                          </div>

                                                          {!isEditing ? (
                                                            <p className="text-sm text-slate-700 leading-relaxed font-normal">
                                                              <TranslatableText text={agent.runtimePrompt} />
                                                            </p>
                                                          ) : (
                                                            <div className="space-y-2.5 pt-2 animate-in fade-in duration-150">
                                                              <textarea
                                                                rows={2}
                                                                value={editedTaskText}
                                                                onChange={(e) =>
                                                                  setEditedTaskText(e.target.value)
                                                                }
                                                                className="w-full text-sm p-3 rounded-xl border-2 border-[#0e7490] bg-white outline-none text-slate-900 resize-none shadow-inner leading-relaxed"
                                                                placeholder="Customize what this agent will do in this plan..."
                                                              />
                                                              <div className="flex items-center justify-end gap-2.5">
                                                                <button
                                                                  type="button"
                                                                  onClick={() =>
                                                                    setEditingAgentId(null)
                                                                  }
                                                                  className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                                                >
                                                                  Cancel
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={() =>
                                                                    handleSaveEditAgent(
                                                                      msg.id,
                                                                      agent.id,
                                                                    )
                                                                  }
                                                                  className="px-4 py-1.5 text-sm font-semibold text-white bg-[#0e7490] hover:bg-[#0c627a] rounded-lg transition cursor-pointer shadow-2xs"
                                                                >
                                                                  Save
                                                                </button>
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* Right Controls: Edit button & Toggle switch */}
                                                      <div className="flex items-center gap-3.5 shrink-0 pt-0.5">
                                                        {!isEditing && (
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              handleStartEditAgent(agent)
                                                            }
                                                            className="text-sm font-medium text-[#0e7490] hover:text-[#0c627a] hover:underline cursor-pointer flex items-center gap-1.5"
                                                            title="Edit agent plan"
                                                          >
                                                            <Pencil className="size-3.5" />
                                                            <span>Edit</span>
                                                          </button>
                                                        )}

                                                        {/* Toggle switch (Spacious & Easy to Read) */}
                                                        <button
                                                          type="button"
                                                          role="switch"
                                                          aria-checked={agent.isEnabled}
                                                          onClick={() =>
                                                            handleToggleAgent(msg.id, agent.id)
                                                          }
                                                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                                                            agent.isEnabled
                                                              ? "bg-[#0e7490]"
                                                              : "bg-slate-300"
                                                          }`}
                                                          title={
                                                            agent.isEnabled
                                                              ? "Disable Agent"
                                                              : "Enable Agent"
                                                          }
                                                        >
                                                          <span
                                                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out mt-0.5 ${
                                                              agent.isEnabled
                                                                ? "translate-x-5.5"
                                                                : "translate-x-0.5"
                                                            }`}
                                                          />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Add Custom Agent Form if triggered */}
                                          {isAddingAgent && (
                                            <div className="rounded-xl border border-sky-300 bg-sky-50/50 p-4 sm:p-5 space-y-3.5 animate-in zoom-in-95 duration-200">
                                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                <span>Add New Custom Merchandising Agent</span>
                                              </h4>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <input
                                                  type="text"
                                                  value={newAgentName}
                                                  onChange={(e) => setNewAgentName(e.target.value)}
                                                  placeholder="Agent Name (e.g. Quality & Fit Inspector)"
                                                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:border-[#0e7490]"
                                                />
                                                <input
                                                  type="text"
                                                  value={newAgentRole}
                                                  onChange={(e) => setNewAgentRole(e.target.value)}
                                                  placeholder="Role Focus (e.g. Fabric Tear & Stitch Audits)"
                                                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white outline-none focus:border-[#0e7490]"
                                                />
                                              </div>
                                              <textarea
                                                rows={2}
                                                value={newAgentTask}
                                                onChange={(e) => setNewAgentTask(e.target.value)}
                                                placeholder="What will this agent do in this plan? (e.g. Will inspect fabric quality certificates and audit supplier lot defect rates...)"
                                                className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-white outline-none focus:border-[#0e7490] resize-none leading-relaxed"
                                              />
                                              <div className="flex items-center justify-end gap-2.5">
                                                <button
                                                  type="button"
                                                  onClick={() => setIsAddingAgentMsgId(null)}
                                                  className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleAddCustomAgent(msg.id)}
                                                  className="px-4 py-1.5 text-sm font-semibold text-white bg-[#0e7490] hover:bg-[#0c627a] rounded-xl cursor-pointer shadow-xs"
                                                >
                                                  Add to Plan
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {/* SUGGESTED NEW SPECIALIST AGENTS — opt-in, nothing runs until approved */}
                                          {(msg.suggestedAgents ?? []).length > 0 && (
                                            <div className="space-y-2.5 pt-2">
                                              <div className="flex items-center justify-between px-1">
                                                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                                  Suggested New Specialist Agents
                                                </span>
                                                <span className="text-xs font-medium text-slate-500">
                                                  {
                                                    (msg.suggestedAgents ?? []).filter(
                                                      (a) => a.isApproved,
                                                    ).length
                                                  }{" "}
                                                  of {(msg.suggestedAgents ?? []).length} approved
                                                </span>
                                              </div>
                                              <p className="text-sm text-slate-600 px-1">
                                                Not part of your standing roster. Approve the ones
                                                you want this report to use.
                                              </p>

                                              <div className="divide-y divide-amber-200/70 rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
                                                {(msg.suggestedAgents ?? []).map((agent) => (
                                                  <div
                                                    key={agent.id}
                                                    className="flex items-start gap-3 p-3.5"
                                                  >
                                                    <div className="size-9 shrink-0 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-base">
                                                      {agent.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-sm font-semibold text-slate-900">
                                                        {agent.name}
                                                      </div>
                                                      <div className="text-sm text-slate-600">
                                                        {agent.role}
                                                      </div>
                                                      <p className="text-sm text-slate-600 mt-1">
                                                        {agent.description}
                                                      </p>
                                                      {agent.rationale ? (
                                                        <p className="text-xs text-amber-800 mt-1.5">
                                                          Why: {agent.rationale}
                                                        </p>
                                                      ) : null}
                                                    </div>
                                                    <button
                                                      type="button"
                                                      role="switch"
                                                      aria-checked={agent.isApproved}
                                                      aria-label={`Approve ${agent.name}`}
                                                      onClick={() =>
                                                        handleToggleSuggestedAgent(msg.id, agent.id)
                                                      }
                                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                                        agent.isApproved
                                                          ? "bg-[#0e7490]"
                                                          : "bg-slate-300"
                                                      }`}
                                                    >
                                                      <span
                                                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                                                          agent.isApproved
                                                            ? "translate-x-4"
                                                            : "translate-x-0.5"
                                                        }`}
                                                      />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* 2. ADDITIONAL INSTRUCTIONS PROVIDING OPTION (Minimum 14px font size) */}
                                          <div className="space-y-2 pt-2">
                                            <div className="text-sm font-bold text-slate-800 uppercase tracking-wider px-1">
                                              <span>Additional Instructions for Agents</span>
                                            </div>
                                            <textarea
                                              rows={2}
                                              value={
                                                instructionDraftMap[msg.id] ??
                                                (msg.customInstructions || "")
                                              }
                                              onChange={(e) =>
                                                setInstructionDraftMap((prev) => ({
                                                  ...prev,
                                                  [msg.id]: e.target.value,
                                                }))
                                              }
                                              placeholder="Provide specific instructions or constraints for the agents (e.g. Focus analysis specifically on South zone retail doors, exclude promotional discounts under 20% margin, or prioritize high-ticket winter wear...)"
                                              className="w-full text-sm p-3.5 rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:border-[#0e7490] focus:ring-1 focus:ring-[#0e7490] transition text-slate-900 resize-none shadow-2xs leading-relaxed"
                                            />
                                          </div>

                                          {/* Action Bar */}
                                          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 flex-wrap gap-3">
                                            <div>
                                              {!isAddingAgent && (
                                                <button
                                                  type="button"
                                                  onClick={() => setIsAddingAgentMsgId(msg.id)}
                                                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-sm font-medium text-slate-700 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                                                >
                                                  <Plus className="size-4 text-slate-500" />
                                                  <span>Add Agent</span>
                                                </button>
                                              )}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => handleRerunWithCustomPlan(msg)}
                                              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0e7490] hover:bg-[#0c627a] text-white text-sm sm:text-base font-semibold transition cursor-pointer shadow-xs hover:shadow active:scale-98"
                                            >
                                              <span>Continue</span>
                                              <ArrowRight className="size-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
                                    {/* Top Ambient Header Banner - EXACT INBOX REPORT STYLE */}
                                    <div className="p-6 sm:p-8 border-b border-slate-200/80 relative overflow-hidden bg-gradient-to-br from-[#dff2fe]/95 via-[#e5faf0]/90 to-[#fefae0]/95">
                                      <div className="pointer-events-none absolute -top-16 -left-16 size-56 rounded-full bg-sky-300/35 blur-3xl" />
                                      <div className="pointer-events-none absolute -bottom-16 -right-16 size-56 rounded-full bg-emerald-300/30 blur-3xl" />
                                      <div className="pointer-events-none absolute top-1/2 left-1/3 size-40 rounded-full bg-amber-200/25 blur-2xl" />

                                      <div className="relative z-10 flex flex-col gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs text-slate-600 font-medium">
                                            {msg.structuredAnswer.reportDate}
                                          </span>
                                        </div>

                                        <h2
                                          style={{ fontWeight: 400 }}
                                          className="text-xl sm:text-2xl lg:text-[25px] font-normal tracking-tight text-slate-900 leading-snug max-w-4xl"
                                        >
                                          {msg.structuredAnswer.reportTitle}
                                        </h2>

                                        <p
                                          style={{ fontWeight: 300 }}
                                          className="text-xs sm:text-sm text-slate-700/90 leading-relaxed font-light"
                                        >
                                          {msg.structuredAnswer.basedOnData ||
                                            (msg.structuredAnswer.howAnswerFound
                                              ?.evidenceDatasets?.[0]?.period
                                              ? `based on the data from ${msg.structuredAnswer.howAnswerFound.evidenceDatasets[0].period}`
                                              : "based on the data form 19 may 08 to 21 march 24")}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="p-5 sm:p-6 space-y-5 text-slate-900">
                                      {/* Section 2: Key Findings */}
                                      {revealed >= 2 ? (
                                        <div className="space-y-2.5 pt-0.5 animate-in fade-in duration-300">
                                          <div>
                                            <span className="inline-flex items-center rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                              Key Findings
                                            </span>
                                          </div>
                                          <ul className="space-y-2">
                                            {(msg.structuredAnswer.keyFinding.includes("\n")
                                              ? msg.structuredAnswer.keyFinding.split(/\n+/)
                                              : msg.structuredAnswer.keyFinding.split(/(?<=\.)\s+/)
                                            )
                                              .map((s) => s.trim())
                                              .filter(Boolean)
                                              .map((point, pIdx) => (
                                                <li
                                                  key={pIdx}
                                                  className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-900 leading-relaxed font-normal"
                                                >
                                                  <span className="size-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                                                  <span>{point}</span>
                                                </li>
                                              ))}
                                          </ul>
                                        </div>
                                      ) : (
                                        /* Key Findings Loader */
                                        <div className="space-y-2.5 pt-1 animate-pulse">
                                          <div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                                              Analyzing Key Findings...
                                            </span>
                                          </div>
                                          <div className="space-y-2 pl-1 pt-1">
                                            <div className="h-4 bg-slate-200/80 rounded-md w-11/12" />
                                            <div className="h-4 bg-slate-200/50 rounded-md w-4/5" />
                                          </div>
                                        </div>
                                      )}

                                      {/* Section 3: Products List */}
                                      {revealed >= 3 ? (
                                        <div className="space-y-2 animate-in fade-in duration-300">
                                          <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="inline-flex items-center rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                              Products List
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const datasets =
                                                  msg.structuredAnswer.howAnswerFound
                                                    ?.evidenceDatasets || [];
                                                const foundDs =
                                                  datasets.find(
                                                    (d) =>
                                                      d.id.includes("inventory") ||
                                                      d.name.toLowerCase().includes("inventory") ||
                                                      d.name.toLowerCase().includes("product"),
                                                  ) || datasets[0];

                                                if (foundDs) {
                                                  setDatasetSearchQuery("");
                                                  setDatasetGroupBy("");
                                                  setDatasetFilterCol("");
                                                  setDatasetFilterVal("");
                                                  setCollapsedGroups({});
                                                  setActiveEvidenceDataset(foundDs);
                                                } else if (
                                                  msg.structuredAnswer.topProducts?.length
                                                ) {
                                                  const customDs: CxoEvidenceDataset = {
                                                    id: `${msg.id}-products`,
                                                    name: `${msg.structuredAnswer.reportTitle} - Products Master Table`,
                                                    badge: "Products Table",
                                                    period:
                                                      msg.structuredAnswer.reportDate ||
                                                      "Current Period",
                                                    totalSum:
                                                      msg.structuredAnswer.kpiStats?.[0]?.value ||
                                                      "₹18.4 Cr",
                                                    recordCount: `${msg.structuredAnswer.topProducts.length} Products`,
                                                    sourceSystem:
                                                      "Store POS & Warehouse ERP Balances",
                                                    citationId: `CIT-${msg.caseId || "DATA"}-PROD`,
                                                    description: `Complete item-level inventory valuation and sales performance records for ${msg.structuredAnswer.reportTitle}.`,
                                                    columns: [
                                                      "Product",
                                                      "Inventory Value",
                                                      "Inventory Age",
                                                      "Sales Trend",
                                                      "Status",
                                                    ],
                                                    rows: msg.structuredAnswer.topProducts.map(
                                                      (p, idx) => ({
                                                        Product: p.product,
                                                        "Inventory Value": p.inventory,
                                                        "Inventory Age": p.age,
                                                        "Sales Trend": p.salesTrend,
                                                        Status:
                                                          idx < 2
                                                            ? "Critical Exposure"
                                                            : "Moderate Risk",
                                                      }),
                                                    ),
                                                  };
                                                  setDatasetSearchQuery("");
                                                  setDatasetGroupBy("");
                                                  setDatasetFilterCol("");
                                                  setDatasetFilterVal("");
                                                  setCollapsedGroups({});
                                                  setActiveEvidenceDataset(customDs);
                                                }
                                              }}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 hover:text-[#0e7490] hover:border-[#0e7490]/40 transition shadow-2xs cursor-pointer group"
                                              title="Open full width data table with search, filters and export"
                                            >
                                              <Table2 className="size-4 text-slate-600 group-hover:text-[#0e7490]" />
                                              <span>Open Table</span>
                                              <ExternalLink className="size-3.5 text-slate-400 group-hover:text-[#0e7490]" />
                                            </button>
                                          </div>

                                          {/* List on chat itself with clear, readable fonts */}
                                          <div className="rounded-xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xs divide-y divide-slate-100">
                                            {msg.structuredAnswer.topProducts.map((p, pIdx) => (
                                              <div
                                                key={pIdx}
                                                className={`flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50/80 transition text-sm ${
                                                  pIdx > 0 ? "pt-2.5" : ""
                                                }`}
                                              >
                                                <div className="flex items-center gap-3 min-w-0">
                                                  <span className="size-6 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {pIdx + 1}
                                                  </span>
                                                  <span className="font-semibold text-slate-900 truncate text-sm sm:text-[15px]">
                                                    {p.product}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                                  <span className="font-bold text-slate-950 font-['Archivo'] tabular-nums text-sm sm:text-base">
                                                    {p.inventory}
                                                  </span>
                                                  <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">
                                                    {p.age}
                                                  </span>
                                                  <span className="text-xs sm:text-sm font-bold text-rose-600 font-['Archivo'] tabular-nums">
                                                    {p.salesTrend}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        /* Products List Loader */
                                        <div className="space-y-2 animate-pulse">
                                          <div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                                              Aggregating Products List...
                                            </span>
                                          </div>
                                          <div className="rounded-xl border border-slate-200/90 bg-white p-3 sm:p-4 space-y-3 shadow-2xs">
                                            {[1, 2, 3].map((i) => (
                                              <div
                                                key={i}
                                                className="flex items-center justify-between gap-3"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <div className="size-6 rounded-full bg-slate-200" />
                                                  <div className="h-4 bg-slate-200 rounded w-36 sm:w-48" />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <div className="h-4 bg-slate-200 rounded w-16" />
                                                  <div className="h-4 bg-slate-100 rounded w-12 hidden sm:block" />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Section 4: Chart */}
                                      {msg.structuredAnswer.findingChart &&
                                        (revealed >= 4 ? (
                                          (() => {
                                            const chart = msg.structuredAnswer.findingChart!;
                                            const maxVal = Math.max(
                                              ...chart.bars.map((b) => b.value),
                                              chart.benchmarkValue || 0,
                                              1,
                                            );

                                            return (
                                              <div className="space-y-2 animate-in fade-in duration-300">
                                                <div>
                                                  <span className="inline-flex items-center rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                                    {chart.title ||
                                                      "Inventory Exposure Concentration"}
                                                  </span>
                                                </div>

                                                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                                                  <div className="overflow-x-auto pb-0.5">
                                                    <div className="min-w-[400px]">
                                                      <div className="relative h-36 sm:h-40 w-full flex items-end justify-around px-3 sm:px-6 pt-6">
                                                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                                                          <div className="border-b border-dashed border-slate-300 w-full" />
                                                          <div className="border-b border-dashed border-slate-300 w-full" />
                                                          <div className="border-b border-dashed border-slate-300 w-full" />
                                                          <div className="border-b border-dashed border-slate-300 w-full" />
                                                        </div>

                                                        {chart.bars.map((bar, bIdx) => {
                                                          const colHeightPercent = Math.min(
                                                            100,
                                                            Math.max(
                                                              15,
                                                              (bar.value / maxVal) * 100,
                                                            ),
                                                          );

                                                          return (
                                                            <div
                                                              key={bIdx}
                                                              className="flex flex-col items-center h-full justify-end group relative z-20"
                                                            >
                                                              <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-white border border-slate-200/90 text-xs font-bold text-slate-800 shadow-2xs whitespace-nowrap tabular-nums font-['Archivo']">
                                                                {bar.formattedValue}
                                                              </div>

                                                              <div
                                                                style={{
                                                                  height: `${colHeightPercent}%`,
                                                                }}
                                                                className="w-10 sm:w-14 rounded-t-lg transition-all duration-500 shadow-xs relative flex flex-col justify-start overflow-hidden bg-gradient-to-t from-[#0e7490] via-[#0891b2] to-cyan-400 border-t border-x border-cyan-200"
                                                              >
                                                                <div className="h-1 w-full bg-white/40 rounded-t-lg" />
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>

                                                      <div className="border-t border-slate-200 w-full" />

                                                      <div className="flex items-start justify-around px-1 sm:px-4 pt-2">
                                                        {chart.bars.map((bar, bIdx) => (
                                                          <div
                                                            key={bIdx}
                                                            className="w-20 sm:w-26 text-center space-y-0.5"
                                                          >
                                                            <span className="text-xs sm:text-sm font-bold text-slate-950 block line-clamp-1 leading-tight">
                                                              {bar.label}
                                                            </span>
                                                            {bar.subtext && (
                                                              <span className="text-xs text-slate-700 font-medium block leading-tight">
                                                                {bar.subtext}
                                                              </span>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()
                                        ) : (
                                          /* Chart Loader */
                                          <div className="space-y-2 animate-pulse">
                                            <div>
                                              <span className="inline-flex items-center gap-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                                <Loader2 className="size-3.5 animate-spin text-blue-600" />
                                                Computing Exposure Concentration Chart...
                                              </span>
                                            </div>
                                            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs h-38 flex items-end justify-around px-4">
                                              <div className="w-12 bg-slate-200 rounded-t-lg h-24" />
                                              <div className="w-12 bg-slate-200 rounded-t-lg h-32" />
                                              <div className="w-12 bg-slate-200 rounded-t-lg h-20" />
                                              <div className="w-12 bg-slate-200 rounded-t-lg h-16" />
                                              <div className="w-12 bg-slate-200 rounded-t-lg h-12" />
                                            </div>
                                          </div>
                                        ))}

                                      {/* Section 5: What is driving the exposure? */}
                                      {revealed >= 5 ? (
                                        <div className="space-y-2 animate-in fade-in duration-300">
                                          <div>
                                            <span className="inline-flex items-center rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                              What is driving the exposure?
                                            </span>
                                          </div>
                                          <p className="text-sm text-slate-700 leading-relaxed font-normal">
                                            {getDriverSummaryText(
                                              msg.caseId,
                                              msg.structuredAnswer.reportTitle,
                                            )}
                                          </p>
                                          <div className="border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
                                            <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800">
                                              <span>Driver</span>
                                              <span>Value</span>
                                            </div>
                                            {msg.structuredAnswer.drivers.map((d, dIdx) => (
                                              <div
                                                key={dIdx}
                                                className={`px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm ${
                                                  dIdx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                                                }`}
                                              >
                                                <span className="font-bold text-slate-900">
                                                  {d.label}
                                                </span>
                                                <span className="font-bold text-slate-950 font-['Archivo'] tabular-nums">
                                                  {d.value}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        /* Drivers Loader */
                                        <div className="space-y-2 animate-pulse">
                                          <div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                                              Calculating Drivers of Exposure...
                                            </span>
                                          </div>
                                          <div className="h-4 bg-slate-200/60 rounded w-3/4 my-1" />
                                          <div className="border border-slate-200 rounded-xl bg-white p-3 space-y-2.5 shadow-2xs">
                                            <div className="h-4 bg-slate-200 rounded w-full" />
                                            <div className="h-4 bg-slate-100 rounded w-full" />
                                            <div className="h-4 bg-slate-100 rounded w-full" />
                                          </div>
                                        </div>
                                      )}

                                      {/* Section 6: How the data is found (Accordion matching reference design) */}
                                      {revealed >= 6 ? (
                                        <div className="pt-4 border-t border-slate-200/80 animate-in fade-in duration-300">
                                          <button
                                            type="button"
                                            onClick={() => toggleHowAnswerFound(msg.id)}
                                            className="w-full flex items-center justify-between py-2 text-left group cursor-pointer select-none transition-colors"
                                            aria-expanded={expandedHowFound[msg.id] !== false}
                                          >
                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                                              How the data is found
                                            </h3>
                                            <div className="flex items-center justify-center size-8 rounded-full group-hover:bg-slate-100 text-slate-500 group-hover:text-blue-600 transition-colors shrink-0">
                                              <ChevronDown
                                                className={`size-4.5 transition-transform duration-200 ${
                                                  expandedHowFound[msg.id] !== false
                                                    ? "rotate-180 text-blue-600"
                                                    : ""
                                                }`}
                                              />
                                            </div>
                                          </button>

                                          {expandedHowFound[msg.id] !== false && (
                                            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                                              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                                                {msg.structuredAnswer.howAnswerFound?.summary ||
                                                  "We checked stock counts and sales bills across 42 stores and warehouses, comparing how long items sit on shelves against how fast they sell."}
                                              </p>
                                              <ReportPipelineDiagram
                                                caseId={msg.caseId}
                                                reportTitle={msg.structuredAnswer.reportTitle}
                                                datasets={
                                                  msg.structuredAnswer.howAnswerFound
                                                    ?.evidenceDatasets || []
                                                }
                                                onSelectDataset={(datasetId) => {
                                                  const ds =
                                                    msg.structuredAnswer.howAnswerFound?.evidenceDatasets?.find(
                                                      (d) => d.id === datasetId,
                                                    );
                                                  if (ds) {
                                                    setDatasetSearchQuery("");
                                                    setDatasetGroupBy("");
                                                    setDatasetFilterCol("");
                                                    setDatasetFilterVal("");
                                                    setCollapsedGroups({});
                                                    setActiveEvidenceDataset(ds);
                                                  }
                                                }}
                                              />

                                              {/* ANALYSIS PERFORMED */}
                                              <div className="space-y-1 pt-1">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                                  ANALYSIS PERFORMED
                                                </h4>
                                                <p className="text-sm text-slate-900 leading-relaxed font-normal">
                                                  {msg.structuredAnswer.howAnswerFound?.analysis ||
                                                    msg.structuredAnswer.howAnswerFound?.summary ||
                                                    "Analyzed 90 days of daily store billing invoices and customer return receipts across 42 retail locations and regional warehouses (Period: June 25 - September 23, 2026). We calculated total gross sales, deducted return items, and cross-referenced unit velocity against inventory age ledgers to compute net exposure sums."}
                                                </p>
                                              </div>

                                              {/* KEY EVIDENCE */}
                                              {msg.structuredAnswer.howAnswerFound?.findings && (
                                                <div className="space-y-1.5 pt-1">
                                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                                    KEY EVIDENCE
                                                  </h4>
                                                  <ul className="space-y-2">
                                                    {msg.structuredAnswer.howAnswerFound.findings.map(
                                                      (f, fIdx) => (
                                                        <li
                                                          key={fIdx}
                                                          className="flex items-start gap-2.5 text-sm text-slate-900 leading-relaxed"
                                                        >
                                                          <span className="size-2 rounded-full bg-blue-600 shrink-0 mt-2" />
                                                          <span>{f}</span>
                                                        </li>
                                                      ),
                                                    )}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        /* How data is found Loader */
                                        <div className="pt-3 border-t border-slate-200/80 space-y-2.5 animate-pulse">
                                          <div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1">
                                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                                              Tracing Audit Trail & Lineage Pipeline...
                                            </span>
                                          </div>
                                          <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-2.5 shadow-2xs">
                                            <div className="h-4 bg-slate-200 rounded w-4/5" />
                                            <div className="flex items-center justify-between gap-3 pt-1">
                                              <div className="h-10 bg-slate-100 rounded-lg flex-1" />
                                              <div className="h-10 bg-slate-100 rounded-lg flex-1" />
                                              <div className="h-10 bg-slate-100 rounded-lg flex-1" />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Section 7: Separate Card for Suggestions */}
                                  {revealed >= 7 && (
                                    <div className="rounded-xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xs animate-in fade-in duration-300">
                                      <div className="px-2.5 pb-2 text-xs font-medium text-slate-500">
                                        Customize report
                                      </div>
                                      <div className="divide-y divide-slate-100">
                                        {[
                                          {
                                            label:
                                              "Change date period to last 30 days & regenerate",
                                            query: `Change date period to last 30 days and regenerate report for ${msg.structuredAnswer.reportTitle}`,
                                          },
                                          {
                                            label:
                                              "Change date period to previous quarter (Q1) & regenerate",
                                            query: `Change date period to previous quarter Q1 and regenerate report for ${msg.structuredAnswer.reportTitle}`,
                                          },
                                          {
                                            label:
                                              "Filter by top 10 flagship stores only & recalculate",
                                            query: `Filter by top 10 flagship stores only and recalculate ${msg.structuredAnswer.reportTitle}`,
                                          },
                                          {
                                            label: "Compare with last year same period (YoY)",
                                            query: `Compare with previous year YoY same period for ${msg.structuredAnswer.reportTitle}`,
                                          },
                                        ].map((sug, sIdx) => (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() => handleAskQuestion(sug.query)}
                                            className="w-full flex items-center justify-between py-2.5 px-2.5 text-left text-sm text-slate-800 hover:text-blue-700 transition cursor-pointer group first:pt-1 last:pb-1"
                                          >
                                            <span className="flex items-center gap-2.5">
                                              <span className="size-2 rounded-full bg-slate-300 group-hover:bg-blue-600 transition shrink-0" />
                                              <span className="font-medium text-slate-900 group-hover:text-blue-700 group-hover:underline underline-offset-2">
                                                {sug.label}
                                              </span>
                                            </span>
                                            <ArrowRight className="size-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition shrink-0" />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    ))}

                    {pastTurns.map((turn) => (
                      <div key={turn.id} className="space-y-4">
                        {turn.query !== "" && (
                          <div className="flex justify-end">
                            <div className="flex max-w-xl items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-2xs">
                              <span><TranslatableText text={turn.query} /></span>
                              <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                                <User className="size-3.5" />
                              </div>
                            </div>
                          </div>
                        )}
                        {turn.awaitingPlan && <PlanSkeleton />}
                        {turn.awaitingChat && <ChatSkeleton />}
                        {turn.chatAnswer !== null && <ChatResponseCard answer={turn.chatAnswer} />}
                        {turn.plan !== null && (
                          <ReportPlanCard
                            plan={turn.plan}
                            onToggleAgent={() => {}}
                            onToggleSuggested={() => {}}
                            onEditAgentPrompt={() => {}}
                            onEditSuggestedPrompt={() => {}}
                            onContinue={() => {}}
                            continueStage="idle"
                            readOnly
                          />
                        )}
                        {(turn.awaitingReport || turn.report !== null) && (
                          <div className="flex justify-end">
                            <div className="flex max-w-xl items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-2xs">
                              <span>{t("reportPlan.continue", { defaultValue: "Continue" })}</span>
                              <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                                <User className="size-3.5" />
                              </div>
                            </div>
                          </div>
                        )}
                        {turn.awaitingReport &&
                          (turn.continueStage === "creating-agents" ? (
                            <AgentCreationLoader count={turn.creatingAgentCount} />
                          ) : (
                            <ReportSkeleton />
                          ))}
                        {turn.report !== null && <ReportView report={turn.report} />}
                      </div>
                    ))}

                    <div
                      ref={activeTurnRef}
                      className={`space-y-4 ${streamingQuery !== "" ? "min-h-[calc(100dvh-6rem)]" : ""}`}
                    >
                      {/* STREAMING / THINKING SHIMMER */}
                      {isGeminiLoading && (
                        <div
                          id="gemini-loader"
                          className="space-y-4 animate-in fade-in duration-200 scroll-mt-6"
                        >
                          {/* User Query Bubble */}
                          <div className="flex justify-end">
                            <div className="max-w-xl rounded-2xl bg-white border border-slate-200/90 shadow-2xs px-4 py-2.5 text-slate-900 text-sm font-medium flex items-center gap-2.5">
                              <span>{streamingQuery}</span>
                              <div className="size-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                                <User className="size-3.5" />
                              </div>
                            </div>
                          </div>

                          {/* Mode-specific waiting state. Stays up until a socket
                            event for this run arrives — nothing here is on a timer. */}
                          {pendingRun?.mode === "chat" ? (
                            <ChatSkeleton />
                          ) : (
                            <PlanSkeleton />
                          )}
                        </div>
                      )}

                      {chatAnswer !== null && (
                        <div className="space-y-4">
                          {streamingQuery !== "" && (
                            <div className="flex justify-end">
                              <div className="flex max-w-xl items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-2xs">
                                <span><TranslatableText text={streamingQuery} /></span>
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                                  <User className="size-3.5" />
                                </div>
                              </div>
                            </div>
                          )}
                          <ChatResponseCard answer={chatAnswer} />
                        </div>
                      )}

                      {/* The plan, once it arrives over the socket, under the
                        prompt that produced it. */}
                      {reportPlan !== null && streamingQuery !== "" && (
                        <div className="mb-4 flex justify-end">
                          <div className="flex max-w-xl items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-2xs">
                            <span><TranslatableText text={streamingQuery} /></span>
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                              <User className="size-3.5" />
                            </div>
                          </div>
                        </div>
                      )}

                      {reportPlan !== null && (
                        <ReportPlanCard
                          plan={reportPlan}
                          onToggleAgent={handleTogglePlanAgent}
                          onToggleSuggested={handleTogglePlanSuggested}
                          onEditAgentPrompt={handleEditPlanAgentPrompt}
                          onEditSuggestedPrompt={handleEditSuggestedPrompt}
                          onContinue={handleContinuePlan}
                          continueStage={continueStage}
                        />
                      )}

                      {/* Pressing Continue is a turn in the conversation, so it
                        reads as one: the user's message, then what it set off
                        underneath — exactly how a prompt and its plan read. */}
                      {continueStage !== "idle" && (
                        <div
                          ref={continueTurnRef}
                          className="min-h-[calc(100dvh-6rem)] space-y-4 animate-in fade-in duration-200"
                        >
                          <div className="flex justify-end">
                            <div className="flex max-w-xl items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-2xs">
                              <span>{t("reportPlan.continue", { defaultValue: "Continue" })}</span>
                              <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                                <User className="size-3.5" />
                              </div>
                            </div>
                          </div>

                          {continueStage === "creating-agents" ? (
                            <AgentCreationLoader count={creatingAgentCount} />
                          ) : (
                            <ReportSkeleton />
                          )}
                        </div>
                      )}

                      {report !== null && <ReportView report={report} />}
                    </div>

                    <div className="h-4" />
                  </div>
                </div>

                {/* The header and composer return together when scrolling up. */}
                <div
                  aria-hidden={!showChatChrome}
                  inert={!showChatChrome}
                  className={`absolute bottom-0 inset-x-0 z-30 pointer-events-none bg-gradient-to-t from-[#def0f5] via-[#def0f5]/90 via-55% to-transparent px-4 pb-4 pt-14 transition-[opacity,transform] duration-200 sm:px-6 ${
                    showChatChrome ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                  }`}
                >
                  {/* Mode is switchable mid-session: a follow-up may want a
                      quick answer even when the first turn was a full report. */}
                  <div
                    className={`mx-auto mb-2 flex items-center justify-center gap-2 pointer-events-auto transition-all duration-300 ease-out ${
                      isSearchFocused || chatQuery.trim() ? "max-w-3xl" : "max-w-2xl"
                    }`}
                  >
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-xs backdrop-blur">
                      <span
                        onClick={() => setIsReportFormatMode(true)}
                        className={`cursor-pointer text-xs transition-all ${
                          isReportFormatMode ? "font-semibold text-[#0e7490]" : "text-slate-500"
                        }`}
                      >
                        Deep Insights
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!isReportFormatMode}
                        aria-label={
                          isReportFormatMode ? "Switch to Chat Mode" : "Switch to Deep Insights"
                        }
                        onClick={() => setIsReportFormatMode((prev) => !prev)}
                        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors"
                      >
                        <span
                          className={`pointer-events-none mt-px inline-block size-4 transform rounded-full bg-[#0e7490] shadow-sm transition duration-200 ease-in-out ${
                            isReportFormatMode ? "translate-x-0.5" : "translate-x-4"
                          }`}
                        />
                      </button>
                      <span
                        onClick={() => setIsReportFormatMode(false)}
                        className={`cursor-pointer text-xs transition-all ${
                          !isReportFormatMode ? "font-semibold text-[#0e7490]" : "text-slate-500"
                        }`}
                      >
                        Chat Mode
                      </span>
                    </div>
                  </div>

                  <div
                    className={`mx-auto flex items-center gap-2 pointer-events-auto transition-all duration-300 ease-out ${
                      isSearchFocused || chatQuery.trim() ? "max-w-3xl" : "max-w-2xl"
                    }`}
                  >
                    <form
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setIsSearchFocused(false);
                        }
                      }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAskQuestion();
                      }}
                      className="flex-1 relative shadow-md hover:shadow-lg rounded-2xl sm:rounded-full bg-white border-2 border-slate-300 hover:border-slate-400 focus-within:border-[#0e7490] focus-within:ring-4 focus-within:ring-[#0e7490]/20 flex items-center px-4 sm:px-5 py-2 gap-3 transition-all ring-1 ring-black/5"
                    >
                      <Search className="size-5 text-[#0e7490] shrink-0 stroke-[2.2]" />
                      <input
                        type="text"
                        value={chatQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        onClick={() => setIsSearchFocused(true)}
                        onChange={(e) => setChatQuery(e.target.value)}
                        placeholder={t("chatInput.followUp", { defaultValue: "Ask follow-up question or instruct AI..." })}
                        className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-none font-normal"
                      />
                      {chatQuery && (
                        <button
                          type="button"
                          onClick={() => setChatQuery("")}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition cursor-pointer"
                          aria-label="Clear search"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                      {VOICE_MODE_ENABLED && (
                        <button
                          type="button"
                          onClick={handleVoiceModeClick}
                          className={`size-9 rounded-full transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                            isVoiceActive
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse"
                              : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-[#0e7490] border border-slate-200/80"
                          }`}
                          title={isVoiceActive ? t("chatInput.listening", { defaultValue: "Listening... Click to stop" }) : t("chatInput.voiceInput", { defaultValue: "Voice input" })}
                          aria-label="Voice input"
                        >
                          <Mic className="size-4" />
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!chatQuery.trim() && !isVoiceActive}
                        className="px-4 sm:px-5 py-2 rounded-xl sm:rounded-full bg-[#0e7490] hover:bg-[#0c627a] disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow active:scale-98 shrink-0"
                      >
                        <span>{t("chatInput.analyze", { defaultValue: "Analyze" })}</span>
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => {
                        handleNewSession();
                      }}
                      className="size-10 rounded-full bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#0e7490] text-slate-600 hover:text-[#0e7490] shadow-md flex items-center justify-center transition cursor-pointer shrink-0"
                      title={t("chatInput.newQuery", { defaultValue: "New Query / Reset" })}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <SpecialistsView refreshKey={specialistsRefreshKey} />
          )}
        </div>

      {/* FULL SCREEN EVIDENCE VERIFICATION & DATASET VIEW WITH ASK AI ON THE RIGHT */}
      {activeEvidenceDataset && (
        <div
          className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* TOP GLOBAL BAR */}
          <header className="h-15 shrink-0 bg-[#072333] border-b border-[#0f354c] flex items-center justify-between px-4 sm:px-6 gap-3 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveEvidenceDataset(null)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-950/70 hover:bg-sky-900 border border-sky-400/20 text-sm font-semibold text-sky-200 hover:text-white transition cursor-pointer shrink-0"
                title="Back to analysis"
              >
                <ArrowLeft className="size-4" />
                <span>Back</span>
              </button>

              <div className="h-6 w-px bg-slate-700/60 hidden sm:block shrink-0" />

              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-white truncate">
                    {activeEvidenceDataset.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-sky-200/80 truncate hidden sm:block">
                    Source:{" "}
                    <span className="text-white font-medium">
                      {activeEvidenceDataset.sourceSystem}
                    </span>{" "}
                    · Period:{" "}
                    <span className="text-white font-medium">{activeEvidenceDataset.period}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleExportCsv(activeEvidenceDataset)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs sm:text-sm font-semibold text-white transition cursor-pointer shadow-xs"
                title="Export CSV spreadsheet"
              >
                <Download className="size-3.5" />
                <span className="hidden md:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEvidenceDataset(null)}
                className="p-1.5 rounded-xl text-sky-200/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close full screen view (Esc)"
              >
                <X className="size-5" />
              </button>
            </div>
          </header>

          {/* FULL SCREEN DATA TABLE VIEW (Ask AI hidden) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50/70 overflow-hidden">
            {/* Table Search, Filter, Grouping & Download Toolbar */}
            <div className="p-3 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 bg-white shrink-0">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {/* Search Input */}
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={datasetSearchQuery}
                    onChange={(e) => setDatasetSearchQuery(e.target.value)}
                    placeholder="Search records..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0e7490] focus:ring-1 focus:ring-[#0e7490] transition"
                  />
                  {datasetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDatasetSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Filter Selector */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs">
                  <Filter className="size-3.5 text-slate-400 shrink-0" />
                  <select
                    value={datasetFilterCol}
                    onChange={(e) => {
                      setDatasetFilterCol(e.target.value);
                      setDatasetFilterVal("");
                    }}
                    className="bg-transparent text-sm text-slate-800 outline-none cursor-pointer font-medium max-w-[125px]"
                    aria-label="Filter by column"
                  >
                    <option value="">Filter Column</option>
                    {activeEvidenceDataset.columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {datasetFilterCol && uniqueFilterValues.length > 0 && (
                    <select
                      value={datasetFilterVal}
                      onChange={(e) => setDatasetFilterVal(e.target.value)}
                      className="bg-slate-50 border-l border-slate-200 pl-2 text-sm text-slate-900 outline-none cursor-pointer font-medium max-w-[130px] truncate"
                      aria-label="Filter value"
                    >
                      <option value="">All Values</option>
                      {uniqueFilterValues.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  )}
                  {(datasetFilterCol || datasetFilterVal) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDatasetFilterCol("");
                        setDatasetFilterVal("");
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600"
                      title="Clear filter"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Group By Selector */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs">
                  <Layers className="size-3.5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-500 font-normal">Group:</span>
                  <select
                    value={datasetGroupBy}
                    onChange={(e) => {
                      setDatasetGroupBy(e.target.value);
                      setCollapsedGroups({});
                    }}
                    className="bg-transparent text-sm text-slate-800 font-medium outline-none cursor-pointer max-w-[125px]"
                    aria-label="Group by column"
                  >
                    <option value="">None</option>
                    {activeEvidenceDataset.columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {datasetGroupBy && (
                    <button
                      type="button"
                      onClick={() => {
                        setDatasetGroupBy("");
                        setCollapsedGroups({});
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600"
                      title="Clear grouping"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Download CSV Button */}
                <button
                  type="button"
                  onClick={() => handleExportCsv(activeEvidenceDataset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 hover:text-[#0e7490] transition cursor-pointer shadow-2xs shrink-0"
                  title="Download CSV"
                >
                  <Download className="size-3.5 text-[#0e7490]" />
                  <span>Download</span>
                </button>
              </div>

              <div className="text-sm text-slate-500 font-normal whitespace-nowrap ml-auto">
                Showing{" "}
                <strong className="text-slate-900 font-semibold">
                  {filteredEvidenceRows.length}
                </strong>{" "}
                of {activeEvidenceDataset.rows.length} records
              </div>
            </div>

            {/* Scrollable Data Table - 14px Font Size */}
            <div className="flex-1 overflow-auto p-3 sm:px-6 sm:py-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left text-[14px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs font-bold sticky top-0 uppercase tracking-wider z-10">
                    <tr>
                      {activeEvidenceDataset.columns.map((col, idx) => (
                        <th
                          key={idx}
                          className="py-2.5 px-3.5 whitespace-nowrap bg-slate-100 font-bold text-slate-700 text-xs sm:text-[13px]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 text-[14px]">
                    {groupedEvidenceRows
                      ? Object.entries(groupedEvidenceRows).map(([groupKey, groupRows]) => {
                          const isCollapsed = collapsedGroups[groupKey];
                          return (
                            <Fragment key={groupKey}>
                              {/* Group Header Row */}
                              <tr
                                onClick={() => toggleGroupCollapse(groupKey)}
                                className="bg-slate-100/90 hover:bg-slate-200/80 transition-colors cursor-pointer border-y border-slate-200 select-none"
                              >
                                <td
                                  colSpan={activeEvidenceDataset.columns.length}
                                  className="py-2 px-3.5 font-semibold text-[14px] text-slate-900"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <ChevronRight
                                        className={`size-3.5 text-slate-600 transition-transform duration-150 ${
                                          isCollapsed ? "" : "rotate-90 text-[#0e7490]"
                                        }`}
                                      />
                                      <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                                        {datasetGroupBy}:
                                      </span>
                                      <span className="text-slate-900 font-bold text-[14px]">
                                        {groupKey}
                                      </span>
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                                        {groupRows.length} records
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-400 font-normal">
                                      {isCollapsed ? "Click to expand" : "Click to collapse"}
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* Group Items */}
                              {!isCollapsed &&
                                groupRows.map((row, rIdx) => (
                                  <tr
                                    key={rIdx}
                                    className={`transition-colors ${rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/85"} hover:bg-cyan-50/60`}
                                  >
                                    {activeEvidenceDataset.columns.map((col, cIdx) => (
                                      <td
                                        key={cIdx}
                                        className="py-2.5 px-3.5 whitespace-nowrap font-normal text-slate-800 text-[14px]"
                                      >
                                        {row[col] ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                            </Fragment>
                          );
                        })
                      : filteredEvidenceRows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={`transition-colors ${rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/85"} hover:bg-cyan-50/60`}
                          >
                            {activeEvidenceDataset.columns.map((col, cIdx) => (
                              <td
                                key={cIdx}
                                className="py-2.5 px-3.5 whitespace-nowrap font-normal text-slate-800 text-[14px]"
                              >
                                {row[col] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                    {filteredEvidenceRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={activeEvidenceDataset.columns.length}
                          className="py-12 text-center text-[14px] text-slate-500"
                        >
                          No matching records found
                          {datasetSearchQuery ? ` for "${datasetSearchQuery}"` : ""}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 italic">
                * {activeEvidenceDataset.description} Citations cross-reconciled against live
                warehouse and POS feeds.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ADD NEW CASE MODAL */}
      {isAddNewCaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#0e7490]/10 text-[#0e7490] flex items-center justify-center font-bold">
                  <Plus className="size-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Active Case</h3>
                  <p className="text-xs text-slate-500">
                    Initiate an autonomous garment & merchandising investigation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddNewCaseOpen(false)}
                className="size-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateNewCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Case Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g. Winterwear Clearance & SKU Markdown Strategy"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#0e7490] focus:ring-2 focus:ring-[#0e7490]/20 outline-none text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Agent / Department
                </label>
                <select
                  value={newCaseAgent}
                  onChange={(e) => setNewCaseAgent(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#0e7490] focus:ring-2 focus:ring-[#0e7490]/20 outline-none text-slate-900 bg-white"
                >
                  <option value="Inventory Planning & Allocation">
                    Inventory Planning & Allocation
                  </option>
                  <option value="Revenue & Markdown Optimization">
                    Revenue & Markdown Optimization
                  </option>
                  <option value="Supply Chain & Stockout Guard">
                    Supply Chain & Stockout Guard
                  </option>
                  <option value="Launch & Seasonal Sell-Through">
                    Launch & Seasonal Sell-Through
                  </option>
                  <option value="Store POS & Regional Performance">
                    Store POS & Regional Performance
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Investigation Objective / Context
                </label>
                <textarea
                  rows={3}
                  value={newCaseSummary}
                  onChange={(e) => setNewCaseSummary(e.target.value)}
                  placeholder="Specify problem, affected stores, categories, or expected markdown outcomes..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#0e7490] focus:ring-2 focus:ring-[#0e7490]/20 outline-none text-slate-900 placeholder:text-slate-400 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const query = newCaseTitle.trim() || "Analyze highest inventory exposure";
                    setIsAddNewCaseOpen(false);
                    switchView("chat");
                    handleAskQuestion(query);
                  }}
                  className="text-xs font-semibold text-[#0e7490] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="size-3.5" />
                  <span>Investigate with AI in Chat</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddNewCaseOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#0e7490] hover:bg-[#0c627a] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="size-3.5 stroke-[2.5]" />
                    <span>Create Case</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** `ApprovedStatus` is free text on the platform; accept the obvious spellings. */
function isApproved(status: string): boolean {
  return status === "approved" || status === "approve" || status === "true";
}

function safeParseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Remove the stored "continue" message from the end of a transcript. Only user
 * rows after the last agent row are considered, so earlier turns are untouched.
 */
function dropTrailingContinue(entries: Array<ConversationEntry>): Array<ConversationEntry> {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry === undefined || entry.role !== "user") break;
    if (entry.kind === "text" && entry.text.trim().toLowerCase() === "continue") {
      return [...entries.slice(0, i), ...entries.slice(i + 1)];
    }
  }
  return entries;
}
