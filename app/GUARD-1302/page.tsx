import Link from "next/link";
export default function Guard1302Index() {
  return (
    <div className="p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">GUARD-1302: Multi-Language AI Course Generation</h1>
      <ul className="list-disc pl-5 space-y-2 text-blue-600">
        <li><Link href="/GUARD-1302/admin/learningmodel?tab=organization">Organization Languages</Link></li>
        <li><Link href="/GUARD-1302/admin/courses/generate">Course Creation Wizard</Link></li>
        <li><Link href="/GUARD-1302/admin/courses/crs_001/edit">Edit Course Lessons (Admin)</Link></li>
        <li><Link href="/GUARD-1302/learner/courses/crs_001">Course Overview (Learner)</Link></li>
        <li><Link href="/GUARD-1302/learner/courses/crs_001/lessons/lsn_001_01">Lesson Player (Learner)</Link></li>
      </ul>
    </div>
  );
}
