# Recuperação do identificador da loja

**Estado: ID real não confirmado.**

- O `.env` confirma que `VITE_SUPABASE_PROJECT_ID` é o ref configurado `flkionbmkuqgkudjjuqk`; não há um UUID real da loja nele. O UUID Lovable `b71066f5-63de-4881-94bf-43af94d65b61` pertence a metadados do projeto/assets e não deve ser usado como `store_id`.
- A rota observada no navegador contém `f5e69cd7-e-b465-4024-9b99-d388262b08fa` (segmento 2 com 1 caractere), portanto é inválida. O painel rejeita esse ID para queries; sem DB não foi possível localizar o UUID correto.

O fallback de materiais em `src/contexts/StoreContext.tsx` contém `f5e69cd7-e-b465-4024-9b99-d388262b08fa`, que não é UUID válido (um grupo tem apenas um caractere). A busca no histórico e nas migrações locais não encontrou outra ocorrência confiável do ID.

O contexto agora valida o formato UUID antes de usar IDs de fallback em consultas ou retornar o ID pelo seletor. Com isso, esse valor malformado não é tratado como identidade do banco. O fallback continua identificando apenas a loja local para renderização; não prova tenant, domínio verificado ou dados remotos.

**Para concluir:** consultar `stores` na origem acessível ou recuperar o ID de backup/configuração autenticada e validar que pertence ao slug/domínio da loja.
