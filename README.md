# TradeProof

Your daily sales. Your business evidence.

TradeProof is an open-source business ledger for small shops. It tracks products and stock, records each sale, calculates revenue and gross profit from those records, and downloads a loan-readiness PDF. An optional Gemma 4 analyst explains the same figures. The report states that the numbers were entered by the business and are not a bank statement, a credit score, or a loan approval.

The first visit opens a clearly labeled fictional shop, Kemi's Corner Shop in Minna, so the ledger can be tried immediately. Your own records are stored separately in this browser.

## Features

- Business profile with name, owner, sector, location, and NGN or USD display.
- Dashboard with revenue, cost of goods sold, gross profit, transaction count, inventory value, a daily or monthly sales chart, recent sales, and low-stock alerts.
- Product catalog with purchase cost, selling price, stock, and low-stock status.
- Inventory adjustments with a reason. Opening stock is logged once.
- Sales ledger. A sale reduces stock once and stores the selling price and purchase cost from that moment.
- Overselling and a second void of the same sale are rejected. Voided sales are left out of totals and the units go back to stock.
- Loan-readiness PDF with profile, report ID, period, sales summary, trend, payments, inventory, recordkeeping checks, and a disclaimer.
- Gemma 4 commentary when `GEMINI_API_KEY` is set. Without a key, the app shows demo insights and says they are not live model output.
- Monetary totals are calculated in code. The model is asked not to invent figures.

## Demo path

1. Open the dashboard. The fictional shop is loaded on a first visit.
2. Open Products and Sales and inspect the records.
3. Record a sale. Stock, revenue, and gross profit update.
4. Open Analyst and generate an analysis.
5. Open Report and download the PDF.

"Use my records" leaves the sample shop and shows an empty ledger for a real business. "Load fictional demo" rebuilds only the sample shop.

## Setup

Requirements: Node.js 20 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

On macOS or Linux, use `cp .env.example .env.local`.

Open [http://localhost:3000](http://localhost:3000).

Leave `GEMINI_API_KEY` empty to use demo insights. To call Gemma 4, create a key in [Google AI Studio](https://aistudio.google.com/apikey) and put it in `.env.local`. The key is read only on the server.

```
GEMINI_API_KEY=your-key
GEMMA_MODEL=gemma-4-26b-a4b-it
```

`GEMMA_MODEL` is optional. The allowed values are the Gemma 4 model ids documented for the Gemini API: `gemma-4-26b-a4b-it` and `gemma-4-31b-it`. See [Run Gemma with the Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

## Scripts

- `npm run dev` starts the local app.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run test` runs the ledger calculations test.
- `npx tsc --noEmit` typechecks the project.

## Architecture

```text
Browser
  LedgerProvider  -> localStorage key tradeproof.v1
  Dashboard, products, sales, report
  PDF built in the browser with jsPDF
        |
        | aggregated totals only
        v
POST /api/analyze
  @google/genai  -> Gemini API generateContent
  model gemma-4-26b-a4b-it (or GEMMA_MODEL)
```

Two ledgers live in one localStorage record: `live` and `demo`. The active one is what the screens show. Sales, stock adjustments, and voids are applied in `lib/ledger-ops.ts`. Totals are computed in `lib/metrics.ts` from sales that are not voided:

- revenue = sum of quantity × selling price stored on the sale
- cost of goods sold = sum of quantity × purchase cost stored on the sale
- gross profit = revenue − cost of goods sold
- inventory value = units on hand × current purchase cost

Changing the currency between NGN and USD does not convert amounts. It only changes the symbol.

The analyst request sends business name, sector, location, currency, and aggregated totals. It does not send the owner's name or payment-reference strings. Individual review flags sent to the model describe the entry without the raw reference.

## Gemma 4

The route `app/api/analyze/route.ts` calls `GoogleGenAI` from `@google/genai`:

```ts
ai.models.generateContent({
  model: "gemma-4-26b-a4b-it",
  contents: prompt,
  config: { systemInstruction, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
})
```

That model id is one of the two Gemma 4 ids listed in Google's Gemini API documentation. If the key is missing, the response `source` is `demo`. If the call fails, the screen shows the error and offers demo insights as a separate action. Demo text is never labeled as Gemma output.

## PDF

Reports are generated in the browser with `jspdf` and `jspdf-autotable`. The file includes the disclaimer that the report is not independently verified, not a bank statement, not a credit score, and not a loan approval. A Gemma narrative is included only when it matches the current ledger and is labeled with the model id. Demo insights are labeled as demo insights.

## Limitations

- Records stay in this browser's localStorage. There is no account, sync, or database.
- There is no foreign-exchange conversion.
- The analyst can be wrong. It explains the figures it is given. It does not verify them.
- A deleted product blocks voiding an old sale, because the units would have nowhere to return.
- This is not lending, accounting, or tax software.

## Contributing

Open an issue or a pull request. Keep money math in `lib/metrics.ts` and `lib/ledger-ops.ts`, and keep model output labeled. Do not commit `.env.local` or API keys.

## License

MIT. See [LICENSE](LICENSE).
