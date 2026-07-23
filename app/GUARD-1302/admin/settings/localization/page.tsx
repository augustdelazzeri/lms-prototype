"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LocalizationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/GUARD-1302/admin/settings/customization?tab=localization");
  }, [router]);
  return null;
}
