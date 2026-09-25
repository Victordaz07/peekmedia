import { AppShell } from "@/components/app/shell";
import { AgencySidebar } from "@/components/app/sidebar";

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return <AppShell sidebar={<AgencySidebar />}>{children}</AppShell>;
}
