import Link from "next/link";
export default function Guard1302Index() {
  return (
    <div className="p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">GUARD-1302: Multi-Language AI Course Generation</h1>
      <ul className="list-disc pl-5 space-y-2 text-blue-600">
        <li><Link href="/GUARD-1302/1?tab=organization">1. Organization Languages</Link></li>
        <li><Link href="/GUARD-1302/2">2. Course Creation Wizard</Link></li>
        <li><Link href="/GUARD-1302/3/crs_001/edit">3. Edit Course Lessons (Admin)</Link></li>
        <li><Link href="/GUARD-1302/4/crs_001">4. Course Overview (Learner)</Link></li>
        <li><Link href="/GUARD-1302/5/lsn_001_01">5. Lesson Player (Learner)</Link></li>
      </ul>
    </div>
  );
}
