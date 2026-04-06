import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialDataTab from "@/components/admin/FinancialDataTab";
import ProductionDataTab from "@/components/admin/ProductionDataTab";
import EvaluationDataTab from "@/components/admin/EvaluationDataTab";
import OverallDataTab from "@/components/admin/OverallDataTab";
import WeeklyTopicsTab from "@/components/admin/WeeklyTopicsTab";

export default function Admin() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600 mb-6">Manage financial data, production metrics, employee evaluations, and overall performance.</p>

        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="financial">Financial Data</TabsTrigger>
            <TabsTrigger value="production">Production Data</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation Data</TabsTrigger>
            <TabsTrigger value="overall">Overall Data</TabsTrigger>
            <TabsTrigger value="weekly_topics">Weekly Topics</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}