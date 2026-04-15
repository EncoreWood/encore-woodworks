import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialDataTab from "@/components/admin/FinancialDataTab";
import ProductionDataTab from "@/components/admin/ProductionDataTab";
import EvaluationDataTab from "@/components/admin/EvaluationDataTab";
import OverallDataTab from "@/components/admin/OverallDataTab";
import WeeklyTopicsTab from "@/components/admin/WeeklyTopicsTab";
import EndOfDayTab from "@/components/admin/EndOfDayTab";
import ComplimentsLog from "@/components/admin/ComplimentsLog";
import MistakeReportsTab from "@/components/admin/MistakeReportsTab";

export default function Admin() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600 mb-6">Manage financial data, production metrics, employee evaluations, and overall performance.</p>

        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="financial">Financial Data</TabsTrigger>
            <TabsTrigger value="production">Production Data</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation Data</TabsTrigger>
            <TabsTrigger value="overall">Overall Data</TabsTrigger>
            <TabsTrigger value="weekly_topics">Weekly Topics</TabsTrigger>
            <TabsTrigger value="end_of_day">End of Day</TabsTrigger>
            <TabsTrigger value="compliments">🎉 Compliments</TabsTrigger>
            <TabsTrigger value="mistake_reports">⚠️ Mistakes</TabsTrigger>
          </TabsList>

          <TabsContent value="financial">
            <FinancialDataTab />
          </TabsContent>

          <TabsContent value="production">
            <ProductionDataTab />
          </TabsContent>

          <TabsContent value="evaluation">
            <EvaluationDataTab />
          </TabsContent>

          <TabsContent value="overall">
            <OverallDataTab />
          </TabsContent>

          <TabsContent value="weekly_topics">
            <WeeklyTopicsTab />
          </TabsContent>

          <TabsContent value="end_of_day">
            <EndOfDayTab />
          </TabsContent>

          <TabsContent value="compliments">
            <ComplimentsLog />
          </TabsContent>

          <TabsContent value="mistake_reports">
            <MistakeReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}