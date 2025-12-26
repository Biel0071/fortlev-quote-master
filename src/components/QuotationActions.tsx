import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentConditions } from '@/types/quotation';
import { FileText, Send, Calendar, MessageSquare, CreditCard, Truck, Image } from 'lucide-react';

interface QuotationActionsProps {
  validity: string;
  observations: string;
  discount: number;
  deliveryTime: string;
  paymentConditions: PaymentConditions;
  onValidityChange: (value: string) => void;
  onObservationsChange: (value: string) => void;
  onDiscountChange: (value: number) => void;
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
  deliveryTime,
  paymentConditions,
  onValidityChange,
  onObservationsChange,
  onDiscountChange,
  onDeliveryTimeChange,
  onPaymentConditionsChange,
  onGeneratePDF,
  onGeneratePNG,
  onSendWhatsApp,
  disabled,
}: QuotationActionsProps) => {
  const handlePaymentChange = (field: keyof PaymentConditions, value: string) => {
    onPaymentConditionsChange({ ...paymentConditions, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validity" className="text-sm font-medium flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Validade do Orçamento
          </Label>
          <Input
            id="validity"
            placeholder="Ex: 15 dias"
            value={validity}
            onChange={(e) => onValidityChange(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount" className="text-sm font-medium">
            Desconto (R$)
          </Label>
          <Input
            id="discount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={discount || ''}
            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryTime" className="text-sm font-medium flex items-center gap-1">
            <Truck className="h-4 w-4" />
            Prazo de Entrega
          </Label>
          <Input
            id="deliveryTime"
            placeholder="Ex: 7 dias úteis"
            value={deliveryTime}
            onChange={(e) => onDeliveryTimeChange(e.target.value)}
            className="h-11"
          />
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
              placeholder="Ex: 5% de desconto via PIX"
              value={paymentConditions.cashDiscount}
              onChange={(e) => handlePaymentChange('cashDiscount', e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="installments" className="text-sm font-medium">
              Parcelado
            </Label>
            <Input
              id="installments"
              placeholder="Ex: 3x no cartão"
              value={paymentConditions.installments}
              onChange={(e) => handlePaymentChange('installments', e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="downPayment" className="text-sm font-medium">
              Entrada Mínima
            </Label>
            <Input
              id="downPayment"
              placeholder="Ex: 30% no fechamento"
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
