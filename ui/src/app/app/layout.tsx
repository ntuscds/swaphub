import { AuthGuard } from "@/components/auth-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard verified>{children}</AuthGuard>;
}
