import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormsSubTab from "./evaluation/FormsSubTab";
import EmployeeReviewSubTab from "./evaluation/EmployeeReviewSubTab";
import ManagerReviewSubTab from "./evaluation/ManagerReviewSubTab";

export default function EvaluationDataTab() {
  return (
    <Tabs defaultValue="forms" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="forms">Questions</TabsTrigger>
        <TabsTrigger value="employee">Employee Review</TabsTrigger>
        <TabsTrigger value="manager">Manager Review</TabsTrigger>
      </TabsList>

      <TabsContent value="forms">
        <FormsSubTab />
      </TabsContent>

      <TabsContent value="employee">
        <EmployeeReviewSubTab />
      </TabsContent>

      <TabsContent value="manager">
        <ManagerReviewSubTab />
      </TabsContent>
    </Tabs>
  );
}