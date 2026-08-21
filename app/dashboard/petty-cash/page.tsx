import { redirect } from "next/navigation";

export default function PettyCashRedirect() {
  redirect("/dashboard/finance?tab=petty-cash");
}
