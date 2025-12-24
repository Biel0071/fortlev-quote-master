import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Send, Calendar, MessageSquare } from 'lucide-react';

interface QuotationActionsProps {
  validity: string;
  observations: string;
  onValidityChange: (value: string) => void;
  onObservationsChange: (value: string) => void;
  onGeneratePDF: () => void;
  onSendWhatsApp: () => void;
  disabled: boolean;
}

export const QuotationActions = ({
  validity,
  observations,
  onValidityChange,
  onObservationsChange,
  onGeneratePDF,
  onSendWhatsApp,
  disabled,
}: QuotationActionsProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validity" className="text-sm font-medium flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Validade do Orçamento
          </Label>
          <Input
            id="validity"
            placeholder="Ex: 7 dias, 15 dias, 30 dias"
            value={validity}
            onChange={(e) => onValidityChange(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations" className="text-sm font-medium flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          Observações
        </Label>
        <Textarea
          id="observations"
          placeholder="Condições de pagamento, prazo de entrega, garantia, etc."
          value={observations}
          onChange={(e) => onObservationsChange(e.target.value)}
          className="min-h-[100px] resize-none"
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
          Gerar PDF do Orçamento
        </Button>

        <Button
          variant="whatsapp"
          size="lg"
          onClick={onSendWhatsApp}
          disabled={disabled}
          className="flex-1"
        >
          <Send className="h-5 w-5" />
          Enviar via WhatsApp
        </Button>
      </div>
    </div>
  );
};
