// Phase II — 1K.1 Admin Analytics & Insights
"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useScope } from "@/hooks/useScope";
import { subscribe, getOrganization } from "@/lib/store-guard-1302";
import MissingLearnersDrawer from "@/components/analytics/MissingLearnersDrawer";
import {
  computeKpis,
  buildCompletionByDept,
  buildCompletionsTrend,
  buildStatusMix,
  computeAiInsights,
  skillCoverageByScope,
} from "@/lib/stats";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CheckCircle,
  Award,
  AlertTriangle,
  Clock,
  FileText,
  TrendingUp,
} from "lucide-react";

export default function AnalyticsPage() {
  const { scope } = useScope();
  const [, forceUpdate] = useState({});
  const [insights, setInsights] = useState(computeAiInsights(scope));
  const [selectedSkillForMissing, setSelectedSkillForMissing] = useState<string | null>(null);
  const [isMissingLearnersDrawerOpen, setIsMissingLearnersDrawerOpen] = useState(false);
  const organization = getOrganization();

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setInsights(computeAiInsights(scope));
  }, [scope]);

  const handleViewMissingLearners = (skillId: string) => {
    setSelectedSkillForMissing(skillId);
    setIsMissingLearnersDrawerOpen(true);
  };

  // Compute all metrics
  const kpis = computeKpis(scope);
  const completionByDept = buildCompletionByDept(scope);
  const completionsTrend = buildCompletionsTrend(scope);
  const statusMix = buildStatusMix(scope);
  const skillCoverage = skillCoverageByScope(scope);

  // Chart colors
  const primaryColor = organization.primaryColor || "#2563EB";
  const chartColors = {
    completed: "#10b981", // green-500
    inProgress: "#3b82f6", // blue-500
    notStarted: "#9ca3af", // gray-400
    dueSoon: "#f59e0b", // amber-500
    overdue: "#ef4444", // red-500
    primary: primaryColor,
  };

  const handleRefreshInsights = () => {
    setInsights(computeAiInsights(scope));
  };

  // Format date for display (MM/DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div className="px-8 py-6 space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">
              Visualize training metrics and identify trends across your organization
            </p>
          </div>

          {/* KPI Cards Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Active Learners */}
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-[12px] text-gray-600">Active Learners</div>
              </div>
              <div className="text-[28px] leading-none font-semibold mb-1 text-gray-900">
                {kpis.activeLearners}
              </div>
              <div className="text-[12px] text-gray-500">
                Users with assignments or progress
              </div>
            </Card>

            {/* Overall Completion */}
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-[12px] text-gray-600">Overall Completion %</div>
              </div>
              <div className={`text-[28px] leading-none font-semibold mb-1 ${
                kpis.completionPct >= 80 ? "text-green-600" : kpis.completionPct >= 60 ? "text-yellow-600" : "text-red-600"
              }`}>
                {kpis.completionPct}%
              </div>
              <div className="h-2 rounded bg-gray-100 mt-3">
                <div
                  className="h-2 rounded"
                  style={{
                    width: `${kpis.completionPct}%`,
                    backgroundColor: kpis.completionPct >= 80 ? "#10b981" : kpis.completionPct >= 60 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </Card>

            {/* Avg Quiz Score */}
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-[12px] text-gray-600">Avg Quiz Score (30d)</div>
              </div>
              <div className={`text-[28px] leading-none font-semibold mb-1 ${
                kpis.avgQuizScore === 0 ? "text-gray-400" : kpis.avgQuizScore >= 80 ? "text-green-600" : kpis.avgQuizScore >= 60 ? "text-yellow-600" : "text-red-600"
              }`}>
                {kpis.avgQuizScore === 0 ? "—" : `${kpis.avgQuizScore}%`}
              </div>
              <div className="text-[12px] text-gray-500">
                {kpis.avgQuizScore === 0 ? "No quiz attempts" : "Last 30 days"}
              </div>
            </Card>

            {/* Overdue Assignments */}
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-[12px] text-gray-600">Overdue Assignments</div>
              </div>
              <div className="text-[28px] leading-none font-semibold mb-1 text-red-600">
                {kpis.overdueCount}
              </div>
              <div className="text-[12px] text-gray-500">Requires attention</div>
            </Card>

            {/* Due Soon */}
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-[12px] text-gray-600">Due Soon (7d)</div>
              </div>
              <div className="text-[28px] leading-none font-semibold mb-1 text-amber-600">
                {kpis.dueSoonCount}
              </div>
              <div className="text-[12px] text-gray-500">Next 7 days</div>
            </Card>

            {/* Certificates Issued */}
            <Card>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-[12px] text-gray-600">Certificates Issued (30d)</div>
              </div>
              <div className="text-[28px] leading-none font-semibold mb-1 text-green-600">
                {kpis.certificatesIssued}
              </div>
              <div className="text-[12px] text-gray-500">Last 30 days</div>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bar Chart: Completion by Department */}
            <Card className="lg:col-span-1">
              <h2 className="text-[16px] font-semibold text-gray-900 mb-4">
                Completion by Department
              </h2>
              {completionByDept.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={completionByDept}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="deptName"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" stackId="a" fill={chartColors.completed} />
                    <Bar dataKey="inProgress" stackId="a" fill={chartColors.inProgress} />
                    <Bar dataKey="notStarted" stackId="a" fill={chartColors.notStarted} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Line Chart: Completions Trend */}
            <Card className="lg:col-span-1">
              <h2 className="text-[16px] font-semibold text-gray-900 mb-4">
                Completions per Day (Last 30d)
              </h2>
              {completionsTrend.length === 0 || completionsTrend.every(d => d.count === 0) ? (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={completionsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={chartColors.primary}
                      strokeWidth={2}
                      name="Completions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Donut Chart: Assignment Status Mix */}
            <Card className="lg:col-span-1">
              <h2 className="text-[16px] font-semibold text-gray-900 mb-4">
                Assignment Status Mix
              </h2>
              {statusMix.completed + statusMix.inProgress + statusMix.dueSoon + statusMix.overdue === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Completed", value: statusMix.completed },
                        { name: "In Progress", value: statusMix.inProgress },
                        { name: "Due Soon", value: statusMix.dueSoon },
                        { name: "Overdue", value: statusMix.overdue },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) => 
                        `${name || ''}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={chartColors.completed} />
                      <Cell fill={chartColors.inProgress} />
                      <Cell fill={chartColors.dueSoon} />
                      <Cell fill={chartColors.overdue} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Skill Coverage Card Row 3 */}
          <Card>
            <div className="mb-4">
              <h2 className="text-[16px] font-semibold text-gray-900 mb-1">Skill Coverage</h2>
              <p className="text-[13px] text-gray-500">
                Top skills by demand and coverage percentage across your organization
              </p>
            </div>
            {skillCoverage.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No skill gaps detected
                </h3>
                <p className="text-sm text-gray-500">
                  All skills in scope have full coverage or no assignments.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-[13px] font-semibold text-gray-700">Skill</th>
                      <th className="text-center py-3 px-4 text-[13px] font-semibold text-gray-700">Coverage</th>
                      <th className="text-center py-3 px-4 text-[13px] font-semibold text-gray-700">Have / Need</th>
                      <th className="text-center py-3 px-4 text-[13px] font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-[13px] font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillCoverage.map((item) => {
                      const isAtRisk = item.coveragePct < 70;
                      const coverageColor = item.coveragePct >= 70 
                        ? "text-green-600" 
                        : item.coveragePct >= 50 
                        ? "text-yellow-600" 
                        : "text-red-600";
                      
                      return (
                        <tr key={item.skillId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <div className="text-[14px] font-medium text-gray-900">
                                {item.skillName}
                              </div>
                              {item.category && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                                  {item.category}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-[14px] font-semibold ${coverageColor}`}>
                              {item.coveragePct}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-[13px] text-gray-600">
                            {item.haveCount} / {item.needCount}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isAtRisk && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                                At-Risk
                              </span>
                            )}
                            {!isAtRisk && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                Good
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="secondary"
                              onClick={() => handleViewMissingLearners(item.skillId)}
                              className="text-xs"
                            >
                              View Missing
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* AI Insight Card Row 3 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-gray-900">AI Insight</h2>
              <Button onClick={handleRefreshInsights}>
                Refresh Insights
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Teams at Risk */}
              <div>
                <h3 className="text-[14px] font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Teams at Risk
                </h3>
                {insights.risks.length === 0 ? (
                  <p className="text-[13px] text-gray-500">No departments at risk</p>
                ) : (
                  <ul className="space-y-1">
                    {insights.risks.map((risk, idx) => (
                      <li key={idx} className="text-[13px] text-gray-700">
                        • {risk}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Quick Wins */}
              <div>
                <h3 className="text-[14px] font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Quick Wins
                </h3>
                {insights.wins.length === 0 ? (
                  <p className="text-[13px] text-gray-500">No near-complete courses</p>
                ) : (
                  <ul className="space-y-1">
                    {insights.wins.map((win, idx) => (
                      <li key={idx} className="text-[13px] text-gray-700">
                        • {win}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Focus Areas */}
              <div>
                <h3 className="text-[14px] font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Focus Areas
                </h3>
                {insights.focus.length === 0 ? (
                  <p className="text-[13px] text-gray-500">No quiz data available</p>
                ) : (
                  <ul className="space-y-1">
                    {insights.focus.map((focus, idx) => (
                      <li key={idx} className="text-[13px] text-gray-700">
                        • {focus}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          {/* Missing Learners Drawer */}
          {selectedSkillForMissing && (
            <MissingLearnersDrawer
              isOpen={isMissingLearnersDrawerOpen}
              onClose={() => {
                setIsMissingLearnersDrawerOpen(false);
                setSelectedSkillForMissing(null);
              }}
              skillId={selectedSkillForMissing}
              skillName={skillCoverage.find(s => s.skillId === selectedSkillForMissing)?.skillName || "Skill"}
              scope={scope}
            />
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}

