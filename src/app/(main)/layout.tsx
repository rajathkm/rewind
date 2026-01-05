import { ResponsiveShell } from "@/components/layout/responsive-shell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveShell>{children}</ResponsiveShell>;
}
