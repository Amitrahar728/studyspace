"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/libraries/create");
  }, [router]);

  return null;
}
