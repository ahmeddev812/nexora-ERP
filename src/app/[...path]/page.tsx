import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";
import { NAV_GROUPS } from "@/components/layout/nav";
import type { IconName } from "@/components/ui/Icon";

interface PlaceholderRoute {
  path: string;
  label: string;
  group: string;
  icon: IconName;
}

function placeholderRoutes(): PlaceholderRoute[] {
  const routes: PlaceholderRoute[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      routes.push({ path: item.href, label: item.label, group: group.label, icon: item.icon });
    }
  }
  routes.push({ path: "/search", label: "Search", group: "Overview", icon: "reports" });
  return routes;
}

const ROUTES = placeholderRoutes();
const ROUTE_BY_PATH = new Map(ROUTES.map((route) => [route.path, route]));

export const dynamicParams = false;

interface RouteParams {
  path: string[];
}

export function generateStaticParams(): RouteParams[] {
  return ROUTES.map((route) => ({ path: route.path.slice(1).split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { path } = await params;
  const route = ROUTE_BY_PATH.get(`/${path.join("/")}`);
  if (!route) return { title: "Not found" };
  return {
    title: route.label,
    description: `${route.label} in the NEXORA workspace.`,
  };
}

export default async function PlaceholderPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { path } = await params;
  const route = ROUTE_BY_PATH.get(`/${path.join("/")}`);
  if (!route) notFound();

  return (
    <RoutePlaceholder label={route.label} group={route.group} icon={route.icon} path={route.path} />
  );
}
