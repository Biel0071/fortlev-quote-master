import { useState } from "react";
import { cloud } from "@/lib/cloud";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, CheckCircle, XCircle, AlertTriangle, Image, DollarSign, Loader2 } from "lucide-react";

type OpResult = {
  total: number;
  validated?: number;
  corrected?: number;
  errors?: number;
  skipped?: number;
  success?: number;
  failed?: number;
  details: Array<{ id: string; name: string; action: string; [k: string]: any }>;
};

export default function AdminBatchOps() {
  const [runningPrices, setRunningPrices] = useState(false);
  const [runningImages, setRunningImages] = useState(false);
  const [runningBoth, setRunningBoth] = useState(false);
  const [priceResult, setPriceResult] = useState<OpResult | null>(null);
  const [imageResult, setImageResult] = useState<OpResult | null>(null);

  const run = async (action: "validate_prices" | "download_images" | "both") => {
    const setRunning = action === "validate_prices" ? setRunningPrices : action === "download_images" ? setRunningImages : setRunningBoth;
    setRunning(true);
    try {
      const { data, error } = await cloud.functions.invoke("batch-product-ops", { body: { action } });
      if (error) throw error;

      if (action === "validate_prices") {
        setPriceResult(data);
        toast.success(`Preços validados: ${data.corrected} corrigidos, ${data.errors} com erro`);
      } else if (action === "download_images") {
        setImageResult(data);
        toast.success(`Imagens: ${data.success} baixadas, ${data.failed} falharam`);
      } else {
        setPriceResult(data.prices);
        setImageResult(data.images);
        toast.success("Operações concluídas!");
      }
    } catch (e) {
      toast.error("Erro ao executar operação");
      console.error(e);
    }
    setRunning(false);
  };

  const anyRunning = runningPrices || runningImages || runningBoth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operações em Lote</h1>
        <p className="text-muted-foreground text-sm">Validar preços e baixar imagens de todos os produtos</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <DollarSign className="h-10 w-10 mx-auto text-primary" />
            <h3 className="font-semibold">Validar Preços</h3>
            <p className="text-xs text-muted-foreground">Verifica todos os preços contra a tabela de inteligência e corrige erros automaticamente</p>
            <Button onClick={() => run("validate_prices")} disabled={anyRunning} className="w-full">
              {runningPrices ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {runningPrices ? "Validando..." : "Executar"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Image className="h-10 w-10 mx-auto text-primary" />
            <h3 className="font-semibold">Baixar Imagens</h3>
            <p className="text-xs text-muted-foreground">Busca e baixa imagens para todos os produtos sem imagem</p>
            <Button onClick={() => run("download_images")} disabled={anyRunning} className="w-full">
              {runningImages ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {runningImages ? "Baixando..." : "Executar"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <div className="flex justify-center gap-1">
              <DollarSign className="h-8 w-8 text-primary" />
              <Image className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold">Executar Ambos</h3>
            <p className="text-xs text-muted-foreground">Valida preços e baixa imagens em sequência</p>
            <Button onClick={() => run("both")} disabled={anyRunning} variant="default" className="w-full">
              {runningBoth ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {runningBoth ? "Executando..." : "Executar Tudo"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Price Results */}
      {priceResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Resultado: Validação de Preços
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold">{priceResult.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-green-600">{priceResult.validated}</div>
                <div className="text-xs text-muted-foreground">Validados</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-yellow-600">{priceResult.corrected}</div>
                <div className="text-xs text-muted-foreground">Corrigidos</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-red-600">{priceResult.errors}</div>
                <div className="text-xs text-muted-foreground">Erros</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-muted-foreground">{priceResult.skipped}</div>
                <div className="text-xs text-muted-foreground">Ignorados</div>
              </div>
            </div>

            {priceResult.details.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {priceResult.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 border rounded">
                    <span className="truncate flex-1">{d.name}</span>
                    {d.action === "corrected" ? (
                      <Badge variant="secondary" className="ml-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        R$ {d.original} → R$ {d.corrected}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-2">
                        <XCircle className="h-3 w-3 mr-1" />
                        R$ {d.price} (fora da faixa)
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Results */}
      {imageResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" /> Resultado: Download de Imagens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold">{imageResult.total}</div>
                <div className="text-xs text-muted-foreground">Sem imagem</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-green-600">{imageResult.success}</div>
                <div className="text-xs text-muted-foreground">Baixadas</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-lg font-bold text-red-600">{imageResult.failed}</div>
                <div className="text-xs text-muted-foreground">Falhas</div>
              </div>
            </div>

            {imageResult.details.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {imageResult.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 border rounded">
                    <span className="truncate flex-1">{d.name}</span>
                    <Badge variant={d.action === "imported" ? "secondary" : "destructive"} className="ml-2">
                      {d.action === "imported" ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Importada</>
                      ) : d.action === "no_images_found" ? (
                        <><AlertTriangle className="h-3 w-3 mr-1" /> Sem resultado</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> {d.action}</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
