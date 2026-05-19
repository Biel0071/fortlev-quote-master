import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Image as ImageIcon, Copy, Check, AlertCircle, ShoppingCart, MapPin, Truck, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { findNearestFactory, getUFCoordinates } from "@/utils/proximity";

interface InterpretedItem {
  id: string;
  originalText: string;
  productName: string;
  quantity: number;
  unit: string;
  price?: number;
  confidence: number;
  suggestedProductId?: string;
  matched: boolean;
}

export default function SmartQuotationGenerator({ onItemsGenerated }: { onItemsGenerated: (items: any[], nearestFactory?: any, customerData?: any) => void }) {
  const [inputText, setInputText] = useState("");
  const [address, setAddress] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretedItems, setInterpretedItems] = useState<InterpretedItem[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [factories, setFactories] = useState<any[]>([]);
  const [nearestFactory, setNearestFactory] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const fetchFactories = async () => {
      const { data } = await supabase
        .from('issuing_companies')
        .select('*')
        .eq('company_type', 'fortlev')
        .eq('is_active', true);
      if (data) setFactories(data);
    };
    fetchFactories();
  }, []);

  useEffect(() => {
    if (!address || factories.length === 0) return;
    
    // Extract UF (two uppercase letters) or CEP
    const ufMatch = address.match(/\b([A-Z]{2})\b/);
    if (ufMatch) {
      const coords = getUFCoordinates(ufMatch[1]);
      if (coords) {
        const nearest = findNearestFactory(coords, factories);
        setNearestFactory(nearest);
      }
    }
  }, [address, factories]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        toast({ title: "Imagem carregada", description: "A imagem está pronta para análise." });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImage(reader.result as string);
            toast({ title: "Imagem colada", description: "Imagem do clipboard carregada para análise." });
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleInterpret = async () => {
    if (!inputText.trim() && !selectedImage) {
      toast({ title: "Entrada vazia", description: "Cole um texto ou uma imagem do pedido.", variant: "destructive" });
      return;
    }

    setIsInterpreting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-quotation-image', {
        body: { text: inputText, image: selectedImage }
      });

      if (error) throw error;

      if (data) {
        if (data.items) {
          const mappedItems: InterpretedItem[] = data.items.map((item: any, index: number) => ({
            id: `item-${index}-${Date.now()}`,
            originalText: item.originalText || item.productName,
            productName: item.productName,
            quantity: item.quantity || 1,
            unit: item.unit || "un",
            price: item.price,
            confidence: 0.9,
            matched: true
          }));
          setInterpretedItems(mappedItems);
        }

        if (data.customer) {
          setCustomerData({
            ...data.customer,
            observations: data.observations,
            validity: data.validity,
            deliveryTime: data.deliveryTime,
            freight: data.freight,
            sellerName: data.sellerName
          });
          if (data.customer.address) {
            setAddress(data.customer.address);
          }
        }

        toast({ title: "Interpretação concluída", description: `${data.items?.length || 0} itens identificados.` });
      } else {
        throw new Error("Não foi possível identificar dados.");
      }
    } catch (error: any) {
      console.error("Erro na interpretação:", error);
      toast({ 
        title: "Erro na análise", 
        description: error.message || "Ocorreu um erro ao processar os dados.", 
        variant: "destructive" 
      });
    } finally {
      setIsInterpreting(false);
    }
  };


  const handleAddAll = () => {
    onItemsGenerated(interpretedItems.map(item => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.price || 0, 
      subtotal: (item.price || 0) * item.quantity,
      unit: item.unit
    })), nearestFactory, customerData);
    
    setInterpretedItems([]);
    setCustomerData(null);
    setInputText("");
    setAddress("");
    setNearestFactory(null);
    toast({ title: "Dados adicionados", description: "Itens e cliente enviados para o orçamento." });
  };

  return (
    <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-primary/10 bg-primary/10">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
          <Wand2 className="h-4 w-4" />
          Gerador Inteligente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Address & Routing */}
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Endereço de Entrega (UF)
          </Label>
          <Input 
            placeholder="Ex: Rua Tal, São Paulo - SP" 
            className="h-9 bg-background/50 border-primary/10 text-xs"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {nearestFactory && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in slide-in-from-top-1">
              <Truck className="h-3.5 w-3.5 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Fábrica sugerida</p>
                <p className="text-[11px] text-emerald-700 font-medium truncate">{nearestFactory.trading_name || nearestFactory.name}</p>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-primary/10" />

        {!interpretedItems.length ? (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              Cole texto, lista ou imagem (Ctrl+V)
            </p>
            
            <div className="relative">
              <Textarea 
                placeholder="Ex: 15 cimento cp2, 20 tijolo 8 furos..." 
                className="min-h-[120px] bg-background/50 border-primary/10 focus-visible:ring-primary/30 text-xs"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
              />
              
              {selectedImage && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                  <div className="relative group max-h-full">
                    <img 
                      src={selectedImage} 
                      alt="Upload preview" 
                      className="max-h-[110px] rounded border border-primary/20 object-contain shadow-lg"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedImage(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleInterpret} 
                disabled={isInterpreting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isInterpreting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Analisar Pedido
                  </>
                )}
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className={`border-primary/20 hover:bg-primary/10 ${selectedImage ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (

          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                Dados Identificados
              </h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setInterpretedItems([]);
                setCustomerData(null);
                setAddress("");
                setNearestFactory(null);
              }} className="h-7 text-[10px]">
                Limpar
              </Button>
            </div>

            {customerData && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-primary truncate max-w-[70%]">{customerData.name || "Cliente não identificado"}</p>
                  <Badge variant="outline" className="text-[9px] h-4">{customerData.document || "Sem documento"}</Badge>
                </div>
                {customerData.observations && (
                  <div className="text-[10px] text-muted-foreground bg-background/50 p-1.5 rounded border border-primary/10">
                    <span className="font-bold text-primary/70">Ref/Obs:</span> {customerData.observations}
                  </div>
                )}
                {(customerData.validity || customerData.deliveryTime) && (
                  <div className="flex gap-2">
                    {customerData.validity && <Badge variant="secondary" className="text-[9px] h-4">Validade: {customerData.validity}</Badge>}
                    {customerData.deliveryTime && <Badge variant="secondary" className="text-[9px] h-4">Entrega: {customerData.deliveryTime}</Badge>}
                  </div>
                )}
              </div>
            )}
            
            <ScrollArea className="h-[200px] pr-3">
              <div className="space-y-2">
                {interpretedItems.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg border border-primary/10 bg-background/40 flex items-start justify-between gap-3 group transition-all hover:border-primary/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-foreground">{item.quantity} {item.unit}</span>
                        <span className="text-sm truncate font-medium text-foreground/80">{item.productName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground italic truncate">"{item.originalText}"</p>
                        {item.price && item.price > 0 && <span className="text-[10px] font-bold text-emerald-600">R$ {item.price.toFixed(2)}</span>}
                      </div>
                    </div>
                    {item.matched ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 pointer-events-none">
                        <Check className="h-3 w-3 mr-1" /> OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 pointer-events-none">
                        <AlertCircle className="h-3 w-3 mr-1" /> Sugerir
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator className="bg-primary/10" />
            
            <Button onClick={handleAddAll} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Gerar Orçamento Completo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}