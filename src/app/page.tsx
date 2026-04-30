import { redirect } from "next/navigation";
import { CanvasShell } from "@/components/canvas/canvas-shell";
import { getCurrentUser } from "@/lib/auth/server";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <CanvasShell userEmail={user.email ?? null} />;
}
