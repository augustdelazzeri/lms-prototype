// Phase II Epic 1: Route Diagnostic Page (Dev Only)
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layouts/AdminLayout";
import Card from "@/components/Card";
import { 
  getCourses, 
  getCourseById,
  getLessonsByCourseId,
  getProgressCoursesByUserId,
  getCurrentUser
} from "@/lib/store-guard-1302";
import { canAccessRoute } from "@/lib/permissions";

export default function DiagnosticPage() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const runDiagnostics = () => {
      const diagnosticResults: any[] = [];

      // Test 1: Store imports
      try {
        const courses = getCourses();
        diagnosticResults.push({
          test: "Store Imports",
          status: "pass",
          message: `✓ Found ${courses.length} courses in store`,
        });

        if (courses.length > 0) {
          const firstCourse = courses[0];
          const retrieved = getCourseById(firstCourse.id);
          diagnosticResults.push({
            test: "getCourseById()",
            status: retrieved ? "pass" : "fail",
            message: retrieved 
              ? `✓ Retrieved "${firstCourse.title}"` 
              : "✗ Failed to retrieve course",
          });

          const lessons = getLessonsByCourseId(firstCourse.id);
          diagnosticResults.push({
            test: "getLessonsByCourseId()",
            status: "pass",
            message: `✓ Found ${lessons.length} lessons for course`,
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: "Store Imports",
          status: "fail",
          message: `✗ Error: ${error.message}`,
        });
      }

      // Test 2: User and Progress
      try {
        const currentUser = getCurrentUser();
        diagnosticResults.push({
          test: "Current User",
          status: "pass",
          message: `✓ User: ${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
        });

        const progress = getProgressCoursesByUserId(currentUser.id);
        diagnosticResults.push({
          test: "User Progress",
          status: "pass",
          message: `✓ Found ${progress.length} progress records`,
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: "User/Progress",
          status: "fail",
          message: `✗ Error: ${error.message}`,
        });
      }

      // Test 3: Permissions
      try {
        const permissionTests = [
          { role: "ADMIN" as const, path: "/admin/courses", expected: true },
          { role: "MANAGER" as const, path: "/admin/courses", expected: true },
          { role: "LEARNER" as const, path: "/admin/courses", expected: false },
          { role: "LEARNER" as const, path: "/learner/courses", expected: true },
        ];

        permissionTests.forEach(test => {
          const result = canAccessRoute(test.role, test.path);
          diagnosticResults.push({
            test: `Permission: ${test.role} -> ${test.path}`,
            status: result === test.expected ? "pass" : "fail",
            message: result === test.expected 
              ? `✓ Correctly ${result ? "allowed" : "blocked"}` 
              : `✗ Expected ${test.expected ? "allow" : "block"}, got ${result ? "allow" : "block"}`,
          });
        });
      } catch (error: any) {
        diagnosticResults.push({
          test: "Permissions",
          status: "fail",
          message: `✗ Error: ${error.message}`,
        });
      }

      // Test 4: Route Files
      const routes = [
        { path: "/admin/courses", file: "app/admin/courses/page.tsx" },
        { path: "/admin/courses/[id]/edit", file: "app/admin/courses/[id]/edit/page.tsx" },
        { path: "/learner/courses", file: "app/learner/courses/page.tsx" },
      ];

      routes.forEach(route => {
        diagnosticResults.push({
          test: `Route: ${route.path}`,
          status: "info",
          message: `📄 File: ${route.file}`,
        });
      });

      setResults(diagnosticResults);
    };

    runDiagnostics();
  }, []);

  const passCount = results.filter(r => r.status === "pass").length;
  const failCount = results.filter(r => r.status === "fail").length;
  const totalTests = results.filter(r => r.status !== "info").length;

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Phase II Epic 1 - Route Diagnostics
        </h1>
        <p className="text-gray-600 mb-6">
          Verify that all course routes and functionality are working correctly.
        </p>

        {/* Summary */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Summary</h2>
              <p className="text-gray-600">
                {passCount} passed, {failCount} failed out of {totalTests} tests
              </p>
            </div>
            <div className="text-right">
              {failCount === 0 ? (
                <div className="text-4xl">✅</div>
              ) : (
                <div className="text-4xl">⚠️</div>
              )}
            </div>
          </div>
        </Card>

        {/* Test Results */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  result.status === "pass"
                    ? "bg-green-50 border border-green-200"
                    : result.status === "fail"
                    ? "bg-red-50 border border-red-200"
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.test}</div>
                    <div className="text-sm text-gray-600 mt-1 font-mono">
                      {result.message}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      result.status === "pass"
                        ? "bg-green-100 text-green-800"
                        : result.status === "fail"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {result.status.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Links */}
        <Card className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/GUARD-1302/admin/courses")}
              className="block w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition-colors"
            >
              → Test /admin/courses
            </button>
            <button
              onClick={() => {
                const courses = getCourses();
                if (courses.length > 0) {
                  router.push(`/GUARD-1302/admin/courses/${courses[0].id}/edit`);
                } else {
                  alert("No courses available. Create one first!");
                }
              }}
              className="block w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition-colors"
            >
              → Test /admin/courses/[id]/edit
            </button>
            <button
              onClick={() => router.push("/GUARD-1302/learner/courses")}
              className="block w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition-colors"
            >
              → Test /learner/courses
            </button>
          </div>
        </Card>

        {/* Troubleshooting */}
        {failCount > 0 && (
          <Card className="mt-6 bg-yellow-50 border border-yellow-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              🔧 Troubleshooting
            </h2>
            <div className="text-sm text-gray-700 space-y-2">
              <p>If tests are failing, try these steps:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Restart the dev server: <code className="bg-white px-2 py-1 rounded">rm -rf .next && npm run dev</code></li>
                <li>Hard refresh your browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)</li>
                <li>Check terminal for compilation errors</li>
                <li>Verify all imports in browser console (F12)</li>
              </ol>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

