import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, BarChart3 } from "lucide-react";
import AdminAiReportsPage from "./AdminAiReportsPage";
import AdminAiAnalysis from "./AdminAiAnalysis";

export default function AdminIntelligenceUnified() {
  const [tab, setTab] = useState("insights");

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Análise e Relatórios IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Insights automáticos e relatórios inteligentes do seu negócio.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="insights" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Insights IA
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-4">
          <AdminAiReportsPage />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-4">
          <AdminAiAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
