import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

export const DeskBoundary = createContext<ShadowRoot | null>(null);

export function useDeskRoot() {
  const root = useContext(DeskBoundary);
  if (!root) throw new Error("Documentation root is not mounted");
  return root;
}

export function DeskPortal({
  component: Portal,
  ...props
}: {
  component: ComponentType<{ container: HTMLElement; children?: ReactNode }>;
  children?: ReactNode;
}) {
  const root = useDeskRoot();
  return (
    <Portal
      {...props}
      container={root.querySelector<HTMLElement>(".desk-docs-portals")!}
    />
  );
}
