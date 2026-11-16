import { getDocuments, getScope, ScopePage } from "@the-docs/core";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";

export function clientLoader({ params }: LoaderFunctionArgs) {
  const scope = params.scopeSlug ? getScope(params.scopeSlug) : undefined;
  if (!scope) throw new Response("Scope not found", { status: 404 });
  return scope;
}

export default function ScopeRoute() {
  const scope = useLoaderData<typeof clientLoader>();
  return <ScopePage scope={scope} documents={getDocuments()} />;
}
