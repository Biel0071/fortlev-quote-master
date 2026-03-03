import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FortlevOverview from "@/pages/dashboard/FortlevOverview";
import ConstructionOverview from "@/pages/dashboard/ConstructionOverview";

export default function AdminDashboardQuotations() {
  return (
    <Tabs defaultValue="fortlev" className="space-y-4">
      <TabsList>
        <TabsTrigger value="fortlev">Fortlev</TabsTrigger>
        <TabsTrigger value="construcao">Construção</TabsTrigger>
      </TabsList>

      <TabsContent value="fortlev" className="space-y-0">
        <FortlevOverview />
      </TabsContent>
      <TabsContent value="construcao" className="space-y-0">
        <ConstructionOverview />
      </TabsContent>
    </Tabs>
  );
}
