import { redirect } from "next/navigation";

export default function SkillsRedirectPage() {
  redirect("/admin/learningmodel?tab=skills");
}
