/**
 * PHASE I POLISH PACK ACCEPTANCE CHECKLIST:
 * ✓ Reset Demo Data button
 * ✓ Load Scenario A (High Overdue) button
 * ✓ Load Scenario B (Mostly Compliant) button
 * ✓ Confirmation modals for each action
 * ✓ Toast on success
 * ✓ Distribution bar showing scenario composition
 * ✓ Re-seed button to regenerate scenario with fresh randomness
 */
"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { resetToSeed, loadScenario, getCompletions, subscribe } from "@/lib/store-guard-1302";
import { runFullSkillsMigration } from "@/lib/skillsMigration";

interface DistributionStats {
  completed: number;
  dueSoon: number;
  assigned: number;
  overdue: number;
  exempt: number;
  total: number;
}

export default function DemoSettingsPage() {
  const [showConfirm, setShowConfirm] = useState<"reset" | "scenarioA" | "scenarioB" | "reseedA" | "reseedB" | null>(null);
  const [distribution, setDistribution] = useState<DistributionStats | null>(null);
  const [lastScenario, setLastScenario] = useState<"A" | "B" | null>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    calculateDistribution();
    const unsubscribe = subscribe(() => {
      calculateDistribution();
    });
    return unsubscribe;
  }, []);

  const calculateDistribution = () => {
    const completions = getCompletions();
    if (completions.length === 0) {
      setDistribution(null);
      return;
    }

    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const stats: DistributionStats = {
      completed: 0,
      dueSoon: 0,
      assigned: 0,
      overdue: 0,
      exempt: 0,
      total: completions.length,
    };

    completions.forEach(c => {
      if (c.status === "COMPLETED") {
        stats.completed++;
      } else if (c.status === "EXEMPT") {
        stats.exempt++;
      } else if (c.status === "OVERDUE") {
        stats.overdue++;
      } else if (c.status === "ASSIGNED") {
        const dueDate = new Date(c.dueAt);
        if (dueDate <= sevenDaysFromNow) {
          stats.dueSoon++;
        } else {
          stats.assigned++;
        }
      }
    });

    setDistribution(stats);
  };

  const handleReset = () => {
    resetToSeed();
    setShowConfirm(null);
    setLastScenario(null);
    alert("Demo data has been reset to seed values.");
  };

  const handleLoadScenario = (scenario: "A" | "B") => {
    loadScenario(scenario);
    setShowConfirm(null);
    setLastScenario(scenario);
    const scenarioName = scenario === "A" ? "High Overdue" : "Mostly Compliant";
    alert(`Scenario ${scenario} (${scenarioName}) has been loaded.`);
  };

  const handleReseed = (scenario: "A" | "B") => {
    loadScenario(scenario);
    setShowConfirm(null);
    const scenarioName = scenario === "A" ? "High Overdue" : "Mostly Compliant";
    alert(`Scenario ${scenario} (${scenarioName}) has been regenerated with fresh randomness.`);
  };

  const getPercentage = (count: number) => {
    if (!distribution || distribution.total === 0) return 0;
    return Math.round((count / distribution.total) * 100);
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Demo Mode Settings</h1>

          {/* Distribution Bar */}
          {distribution && distribution.total > 0 && (
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Data Distribution</h2>
              <div className="mb-4">
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {distribution.completed > 0 && (
                    <div 
                      className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${getPercentage(distribution.completed)}%` }}
                      title={`Completed: ${distribution.completed} (${getPercentage(distribution.completed)}%)`}
                    >
                      {getPercentage(distribution.completed)}%
                    </div>
                  )}
                  {distribution.dueSoon > 0 && (
                    <div 
                      className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${getPercentage(distribution.dueSoon)}%` }}
                      title={`Due Soon: ${distribution.dueSoon} (${getPercentage(distribution.dueSoon)}%)`}
                    >
                      {getPercentage(distribution.dueSoon)}%
                    </div>
                  )}
                  {distribution.assigned > 0 && (
                    <div 
                      className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${getPercentage(distribution.assigned)}%` }}
                      title={`Assigned: ${distribution.assigned} (${getPercentage(distribution.assigned)}%)`}
                    >
                      {getPercentage(distribution.assigned)}%
                    </div>
                  )}
                  {distribution.overdue > 0 && (
                    <div 
                      className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${getPercentage(distribution.overdue)}%` }}
                      title={`Overdue: ${distribution.overdue} (${getPercentage(distribution.overdue)}%)`}
                    >
                      {getPercentage(distribution.overdue)}%
                    </div>
                  )}
                  {distribution.exempt > 0 && (
                    <div 
                      className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${getPercentage(distribution.exempt)}%` }}
                      title={`Exempt: ${distribution.exempt} (${getPercentage(distribution.exempt)}%)`}
                    >
                      {getPercentage(distribution.exempt)}%
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Completed: {distribution.completed} ({getPercentage(distribution.completed)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>Due Soon (≤7d): {distribution.dueSoon} ({getPercentage(distribution.dueSoon)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Assigned: {distribution.assigned} ({getPercentage(distribution.assigned)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Overdue: {distribution.overdue} ({getPercentage(distribution.overdue)}%)</span>
                </div>
                {distribution.exempt > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span>Exempt: {distribution.exempt} ({getPercentage(distribution.exempt)}%)</span>
                  </div>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Total completions: {distribution.total}
              </div>
            </Card>
          )}

          <div className="space-y-6">
            {/* Reset Demo Data */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Reset Demo Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Restore all data to the original seed values. This will clear any changes you've
                made during this session.
              </p>
              <Button variant="secondary" onClick={() => setShowConfirm("reset")}>
                Reset Demo Data
              </Button>
            </Card>

            {/* Scenario A */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Scenario A: High Overdue
              </h2>
              <div className="text-sm text-gray-600 mb-4 space-y-1">
                <p>Load a dataset with high non-compliance:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>70% of completions are OVERDUE (3-45 days overdue)</li>
                  <li>20% are ASSIGNED (due in next 3-14 days)</li>
                  <li>10% are COMPLETED (last 60 days)</li>
                  <li>≤3% EXEMPT with reasons</li>
                  <li>At least one training has a policy URL</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowConfirm("scenarioA")}>
                  Load Scenario A
                </Button>
                {lastScenario === "A" && (
                  <Button variant="secondary" onClick={() => setShowConfirm("reseedA")}>
                    ♻️ Re-seed A
                  </Button>
                )}
              </div>
            </Card>

            {/* Scenario B */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Scenario B: Mostly Compliant
              </h2>
              <div className="text-sm text-gray-600 mb-4 space-y-1">
                <p>Load a dataset with high compliance:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>90% of completions are COMPLETED (last 90 days)</li>
                  <li>8% are DUE SOON (due within next 7 days)</li>
                  <li>2% are OVERDUE (≤5 days overdue)</li>
                  <li>~30% of completed have proof of completion URLs</li>
                  <li>Balanced across sites and departments</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowConfirm("scenarioB")}>
                  Load Scenario B
                </Button>
                {lastScenario === "B" && (
                  <Button variant="secondary" onClick={() => setShowConfirm("reseedB")}>
                    ♻️ Re-seed B
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Skills V2 Migration */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills V2 Migration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Migrate from old skills format to Skills V2 with user skill records, certifications, and expiry tracking.
              This creates SkillV2 records from existing skills, converts Course.skills[] to Course.skillsGranted[],
              and generates UserSkillRecords from completed trainings.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!confirm("Run Skills V2 migration? This will create UserSkillRecords from existing data.")) return;
                  setIsMigrating(true);
                  try {
                    const result = runFullSkillsMigration();
                    setMigrationResult(result);
                  } catch (error) {
                    setMigrationResult({ success: false, error: String(error) });
                  } finally {
                    setIsMigrating(false);
                  }
                }}
                disabled={isMigrating}
              >
                {isMigrating ? "Migrating..." : "Run Migration"}
              </Button>
              {migrationResult && (
                <Badge variant={migrationResult.success ? "success" : "error"}>
                  {migrationResult.success ? "Success" : "Completed with errors"}
                </Badge>
              )}
            </div>
            {migrationResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg overflow-auto max-h-60">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(migrationResult, null, 2)}
                </pre>
              </div>
            )}
          </Card>

          {/* Confirmation Modal */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Action</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {showConfirm === "reset" &&
                    "Are you sure you want to reset all data? This will discard all changes."}
                  {showConfirm === "scenarioA" &&
                    "Are you sure you want to load Scenario A (High Overdue)? This will replace current training and completion data."}
                  {showConfirm === "scenarioB" &&
                    "Are you sure you want to load Scenario B (Mostly Compliant)? This will replace current training and completion data."}
                  {showConfirm === "reseedA" &&
                    "Re-generate Scenario A with fresh randomness? This will create a new dataset matching the same targets (70% overdue, 20% assigned, 10% completed)."}
                  {showConfirm === "reseedB" &&
                    "Re-generate Scenario B with fresh randomness? This will create a new dataset matching the same targets (90% completed, 8% due soon, 2% overdue)."}
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowConfirm(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (showConfirm === "reset") {
                        handleReset();
                      } else if (showConfirm === "scenarioA") {
                        handleLoadScenario("A");
                      } else if (showConfirm === "scenarioB") {
                        handleLoadScenario("B");
                      } else if (showConfirm === "reseedA") {
                        handleReseed("A");
                      } else if (showConfirm === "reseedB") {
                        handleReseed("B");
                      }
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}

