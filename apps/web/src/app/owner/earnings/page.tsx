"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerEarningsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/libraries/create");
  }, [router]);

  return null;
}
