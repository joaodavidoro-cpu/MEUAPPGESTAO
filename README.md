# 📈 Motoka Gestão

Aplicativo (PWA) para controle de **gastos da moto**, **gastos pessoais**, **manutenção de peças** e **orçamentos para clientes**.

✅ **Funciona 100% offline** — todos os dados ficam salvos no próprio iPhone (não precisa de servidor, banco de dados nem domínio pago).
✅ Otimizado para **iPhone 14 Plus** (layout mobile, navegação inferior, sem zoom indesejado).

---

## 📲 Como instalar no iPhone (sem comprar nada)

Como é um app web (PWA), você só precisa abri-lo uma vez e "Adicionar à Tela de Início". Há duas formas:

### Opção A — Hospedagem grátis (recomendado, funciona offline de verdade)
1. Suba esta pasta para o **GitHub Pages** (grátis):
   - No repositório → **Settings → Pages → Branch: main → /(root) → Save**.
   - Em alguns minutos o GitHub gera um link `https://seuusuario.github.io/meuappgestao/`.
2. Abra esse link no **Safari** do iPhone.
3. Toque no botão **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.
4. Pronto! Agora abra pelo ícone na tela inicial — funciona **sem internet**.

### Opção B — Testar localmente no computador
```bash
cd MEUAPPGESTAO
python3 -m http.server 8080
```
Abra `http://localhost:8080` no navegador.

> O Service Worker (que garante o uso offline) só funciona via `https://` ou `localhost` — por isso a Opção A é a indicada para usar no celular.

---

## 🧭 Funcionalidades

| Aba | O que faz |
|-----|-----------|
| **Painel** | Resumo de ganhos, lucro, média por km/hora, despesas da moto e total de gastos pessoais. Filtro por período (todos / mês / 7 dias) e exportação CSV. |
| **Novo Registro** | Botão alterna entre **🏍️ Gasto da Moto** (mesmos campos da planilha: ganhos por plataforma, km, horas, gastos na rua, manutenção, combustível, observações) e **👤 Gasto Pessoal** (categoria, valor, descrição, forma de pagamento). |
| **Histórico** | Lista todos os registros com **cores diferentes**: azul = moto, laranja = pessoal. Busca e filtros. Editar/excluir. |
| **Manutenção** | Cadastre peças (pneu, óleo, corrente...) marcando o **km inicial** e a **vida útil estimada**. Atualize o km atual para acompanhar **quantos km a peça já rodou** e quando trocar. |
| **Orçamento** | Crie orçamentos para clientes (origem, destino, distância, tipo de entrega, peso, urgência, espera). Calcula o valor automaticamente, controla status (enviado/aceito/recusado) e permite compartilhar por WhatsApp. |

---

## 💾 Sobre os dados
- Tudo é salvo no `localStorage` do navegador/app — fica **só no seu aparelho**.
- Use **Painel → Exportar dados (CSV)** para fazer backup.
- Limpar o histórico do Safari ou desinstalar pode apagar os dados; faça backup do CSV periodicamente.

## ⚙️ Parâmetros de cálculo do orçamento (ajustáveis em `js/app.js`)
- Valor base por tipo de entrega: Documento R$8 · Pequena R$12 · Média R$18 · Grande R$25 · Expressa R$30
- `TAXA_KM` = R$ 2,50 por km · `TAXA_ESPERA` = R$ 0,50 por minuto · Urgente = +10%

---

Feito com 💙 para motoboys. Sem mensalidade, sem servidor.
