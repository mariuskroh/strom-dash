# Roadmap

Strom-Dashboard tracks household electricity use from manual meter readings. You enter the meter value whenever you read it, and the app works out how much you used per day, per period and per month. Later it will also show what that electricity costs you, whether a cheaper contract exists, and which devices account for how much of your consumption.

Everything stays local: plain Node.js, no dependencies, data as JSON in `data/`.

## Done (v0.1)

- Enter meter readings (date + kWh), with validation and a list to delete them
- Periods between consecutive readings: days, kWh used, Ø/day, Ø/30 days, trend vs. previous period
- Stat tiles: Ø per day, Ø per month, annual projection, estimated cost per month
- Bar chart of kWh/day per period
- Simple settings: price per kWh and monthly base fee

## Next

### 1. Consumption overview

- Daily view. Readings are irregular, so daily values are spread evenly across each period and marked as estimates.
- Last period, current month and last month. Calendar months are split from periods by day count.
- Useful extras: projected meter reading at year end, comparison with a typical household of the same size, a reminder when the last reading is more than ~30 days old.

### 2. Costs and contract

- Contract details: provider, unit price (ct/kWh), base fee (€/month), monthly prepayment (Abschlag), start date, minimum term, notice period. Price changes are kept as history so old periods are calculated with the price that applied then.
- Actual cost per period, month and year.
- Prepayment vs. projected cost, giving the expected back payment (Nachzahlung) or refund (Guthaben) at the annual bill.
- Reminder before the notice deadline.
- Cheaper contracts: enter alternative offers and compare them against your real consumption. Fetching tariffs automatically is an open question (see below).

### 3. Device estimates

- Add devices with watts and usage time, e.g. 2,000 W × 3 h/day = 6 kWh/day ≈ 180 kWh/month.
- Optional standby watts and days per week.
- Show each device's share of the measured consumption, plus the part that no device explains yet.
- What-if: "run X one hour less per day" → kWh and € saved per year.

### 4. Dashboard

One overview page that pulls the pieces together: current consumption and trend, cost so far this year, prepayment balance, device breakdown, contract status, and the biggest saving opportunity.

## Open questions

- Where to get tariff data. German comparison portals have no free public API, so manual entry may stay the default.
- Importing data from a smart meter or the provider's portal (CSV) instead of typing readings by hand.
- Whether any of this should ever leave the local machine (sync, phone access).
