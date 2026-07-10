import { redirect } from "next/navigation";

// The Lead Table is the home screen (Brief §3 — START HERE).
export default function Home() {
  redirect("/leads");
}
