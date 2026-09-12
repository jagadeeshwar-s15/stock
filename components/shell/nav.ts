import type { ComponentType, SVGProps } from "react";

import {
  IconData,
  IconFeatures,
  IconInsights,
  IconMethod,
  IconModel,
  IconOverview,
} from "@/components/ui/icon";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}

/** The five application pages, in the order of the analysis workflow. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    short: "Home",
    description: "Headline results and the state of the pipeline",
    icon: IconOverview,
  },
  {
    href: "/data",
    label: "Data & Leakage",
    short: "Data",
    description: "Dataset, cleaning, target definition and the leakage audit",
    icon: IconData,
  },
  {
    href: "/features",
    label: "Feature Engineering",
    short: "Features",
    description: "Technical indicators, definitions and causality evidence",
    icon: IconFeatures,
  },
  {
    href: "/evaluation",
    label: "Model Evaluation",
    short: "Models",
    description: "Four-way comparison, confusion matrices and validation",
    icon: IconModel,
  },
  {
    href: "/insights",
    label: "Insights & Results",
    short: "Insights",
    description: "Predictions over the test window, findings and limitations",
    icon: IconInsights,
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/methodology",
    label: "Methodology",
    short: "Method",
    description: "How to reproduce the pipeline, and what the numbers mean",
    icon: IconMethod,
  },
];

export function navItemFor(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS, ...SECONDARY_NAV].find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
}
