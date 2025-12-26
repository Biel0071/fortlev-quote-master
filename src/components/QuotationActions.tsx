import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentConditions } from '@/types/quotation';
import { FileText, Send, Calendar, MessageSquare, CreditCard, Truck, Image, Percent, DollarSign } from 'lucide-react';
import { useState } from 'react';

interface QuotationActionsProps {
  validity: string;
  observations: string;
  discount: number;
  freight: number;
  subtotal: number;
  deliveryTime: string;
  paymentConditions: PaymentConditions;
  onValidityChange: (value: string) => void;
  onObservationsChange: (value: string) => void;
  onDiscountChange: (value: number) => void;
  onFreightChange: (value: number) => void;
  onDeliveryTimeChange: (value: string) => void;
  onPaymentConditionsChange: (conditions: PaymentConditions) => void;
  onGeneratePDF: () => void;
  onGeneratePNG: () => void;
  onSendWhatsApp: () => void;
  disabled: boolean;
}

export const QuotationActions = ({
  validity,
  observations,
  discount,
  freight,
  subtotal,
  deliveryTime,
  paymentConditions,
  onValidityChange,
  onObservationsChange,
  onDiscountChange,
  onFreightChange,
  onDeliveryTimeChange,
  onPaymentConditionsChange,
  onGeneratePDF,
  onGeneratePNG,
  onSendWhatsApp,
  disabled,
}: QuotationActionsProps) => {
  const [discountType, setDiscountType] = useState<'value' | 'percent'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [freightInput, setFreightInput] = useState('');

  const handleFreightChange = (value: string) => {
    setFreightInput(value);
    const numValue = parseFloat(value) || 0;
    onFreightChange(numValue);
  };

  const handlePaymentChange = (field: keyof PaymentConditions, value: string) => {
    onPaymentConditionsChange({ ...paymentConditions, [field]: value });
  };

  const handleDiscountChange = (value: string) => {
    setDiscountInput(value);
    const numValue = parseFloat(value) || 0;
    
    if (discountType === 'percent') {
      const discountValue = (subtotal * numValue) / 100;
      onDiscountChange(discountValue);
    } else {
      onDiscountChange(numValue);
    }
  };

  const handleDiscountTypeChange = (type: 'value' | 'percent') => {
    setDiscountType(type);
    setDiscountInput('');
    onDiscountChange(0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validity" className="text-sm font-medium flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Validade do Orçamento
          </Label>
          <Select value={validity} onValueChange={onValidityChange}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione a validade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3 dias">3 dias</SelectItem>
              <SelectItem value="5 dias">5 dias</SelectItem>
              <SelectItem value="7 dias">7 dias (1 semana)</SelectItem>
              <SelectItem value="10 dias">10 dias</SelectItem>
              <SelectItem value="15 dias">15 dias</SelectItem>
              <SelectItem value="30 dias">30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount" className="text-sm font-medium">
            Desconto
          </Label>
          <div className="flex gap-2">
            <Select value={discountType} onValueChange={(v) => handleDiscountTypeChange(v as 'value' | 'percent')}>
              <SelectTrigger className="w-20 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">
                  <Percent className="h-4 w-4" />
                </SelectItem>
                <SelectItem value="value">
                  <DollarSign className="h-4 w-4" />
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              placeholder={discountType === 'percent' ? '0%' : 'R$ 0,00'}
              value={discountInput}
              onChange={(e) => handleDiscountChange(e.target.value)}
              className="h-11 flex-1"
            />
          </div>
          {discount > 0 && (
            <p className="text-xs text-muted-foreground">
              Desconto: R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryTime" className="text-sm font-medium flex items-center gap-1">
            <Truck className="h-4 w-4" />
            Prazo de Entrega
          </Label>
          <Select value={deliveryTime} onValueChange={onDeliveryTimeChange}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione o prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3 a 5 dias úteis">3 a 5 dias úteis</SelectItem>
              <SelectItem value="5 a 7 dias úteis">5 a 7 dias úteis</SelectItem>
              <SelectItem value="7 a 10 dias úteis">7 a 10 dias úteis</SelectItem>
              <SelectItem value="10 a 15 dias úteis">10 a 15 dias úteis</SelectItem>
              <SelectItem value="15 a 20 dias úteis">15 a 20 dias úteis</SelectItem>
              <SelectItem value="A combinar">A combinar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="freight" className="text-sm font-medium flex items-center gap-1">
            <Truck className="h-4 w-4" />
            Valor do Frete
          </Label>
          <Input
            id="freight"
            type="number"
            min="0"
            step="0.01"
            placeholder="R$ 0,00 (Grátis)"
            value={freightInput}
            onChange={(e) => handleFreightChange(e.target.value)}
            className="h-11"
          />
          {freight === 0 && (
            <p className="text-xs text-green-600 font-medium">
              Frete Grátis
            </p>
          )}
          {freight > 0 && (
            <p className="text-xs text-muted-foreground">
              Frete: R$ {freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-fortlev-yellow" />
          Condições de Pagamento
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cashDiscount" className="text-sm font-medium">
              À Vista
            </Label>
            <Input
              id="cashDiscount"
              placeholder="Ex: 7% de desconto"
              value={paymentConditions.cashDiscount}
              onChange={(e) => handlePaymentChange('cashDiscount', e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="installments" className="text-sm font-medium">
              Cartão
            </Label>
            <Input
              id="installments"
              placeholder="Ex: 10x sem juros"
              value={paymentConditions.installments}
              onChange={(e) => handlePaymentChange('installments', e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="downPayment" className="text-sm font-medium">
              Parcelamento
            </Label>
            <Input
              id="downPayment"
              placeholder="Ex: Sem juros - consultar"
              value={paymentConditions.downPayment}
              onChange={(e) => handlePaymentChange('downPayment', e.target.value)}
              className="h-11"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations" className="text-sm font-medium flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          Informações Adicionais
        </Label>
        <Textarea
          id="observations"
          placeholder="Informações adicionais como garantia, instalação, etc."
          value={observations}
          onChange={(e) => onObservationsChange(e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="fortlev"
          size="lg"
          onClick={onGeneratePDF}
          disabled={disabled}
          className="flex-1"
        >
          <FileText className="h-5 w-5" />
          Baixar PDF
        </Button>

        <Button
          variant="accent"
          size="lg"
          onClick={onGeneratePNG}
          disabled={disabled}
          className="flex-1"
        >
          <Image className="h-5 w-5" />
          Baixar PNG
        </Button>

        <Button
          variant="whatsapp"
          size="lg"
          onClick={onSendWhatsApp}
          disabled={disabled}
          className="flex-1"
        >
          <Send className="h-5 w-5" />
          Enviar WhatsApp
        </Button>
      </div>
    </div>
  );
};
