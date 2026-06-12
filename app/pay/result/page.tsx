import { Suspense } from "react";
import PayResultClient from "./PayResultClient";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function PayResultPage() {
  return (
    <Suspense>
      <PayResultClient />
    </Suspense>
  );
}
