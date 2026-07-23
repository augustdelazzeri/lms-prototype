"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LearnerCoursesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learner");
  }, [router]);

  return null;
}
