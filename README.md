# 🚗 CarbuyGuide

A smart car recommendation engine that helps buyers go from "I don't know what to buy" to "I'm confident about my shortlist" — using usage-based questionnaire scoring and monthly ownership cost analysis.

## The Problem

Car buyers face too many options and no easy way to figure out which car is right for them. Traditional platforms rely on filters (price, fuel, body type) which still leave users overwhelmed. They also ignore the real cost of ownership — fuel, EMI, insurance, and maintenance — which varies drastically based on how much you actually drive.

## The Solution

CarbuyGuide asks buyers _how_ they'll use the car, then scores 50 cars against their answers and shows a ranked shortlist with transparent monthly ownership costs.

**Flow:** Questionnaire → Scored Shortlist (Top Pick + 4 alternatives) → Monthly Cost Breakdown

---

## Features

- **Usage-based recommendations** — Questions about daily distance, terrain, passengers, priorities (not just filters)
- **Monthly ownership cost calculator** — Fuel + EMI + Insurance + Maintenance, personalized to user's driving distance
- **Smart budget handling** — When no cars match within budget, shows the best in-budget option (with unmet criteria) + expanded suggestions
- **Deal-breaker elimination** — "No AMT", "Must have 5-star safety", "Need 7 seats" etc.
- **One question at a time** — Clean UX with auto-proceed on single-choice, back navigation, progress bar
- **Car listing with pagination** — Browse all 50 cars, 10 per page
- **Individual car detail pages** — Full specs, features, pros/cons

---

## Tech Stack

| Layer        | Technology                         |
| ------------ | ---------------------------------- |
| Backend      | Node.js + Express                  |
| Templating   | Pug (server-side rendered)         |
| Architecture | MVC                                |
| Session      | express-session (in-memory)        |
| Database     | JSON files (no DB needed for demo) |
| Styling      | Custom CSS (no framework)          |

---

## Project Structure

```
CarbuyGuide/
├── app.js                          # Express entry point
├── package.json
├── .npmrc                          # npm registry config
│
├── controllers/                    # Request handlers
│   ├── homeController.js           # Home page (car listing + pagination)
│   ├── assistantController.js      # Questionnaire flow + results
│   └── carsController.js           # Individual car detail
│
├── models/                         # Data access + business logic
│   ├── carModel.js                 # Car data (pagination, lookup, filters)
│   ├── questionnaireModel.js       # Question flow (conditional steps)
│   └── recommendationModel.js      # Transforms answers → scoring engine
│
├── views/                          # Pug templates
│   ├── layout.pug                  # Base layout with nav
│   ├── home.pug                    # Car grid with pagination
│   ├── error.pug
│   ├── assistant/
│   │   ├── question.pug            # One question at a time
│   │   ├── results.pug             # Top pick + suggestions + cost
│   │   └── no-results.pug
│   └── cars/
│       └── detail.pug              # Single car specs page
│
├── routes/                         # Route definitions
│   ├── homeRoutes.js
│   ├── assistantRoutes.js
│   └── carsRoutes.js
│
├── public/                         # Static assets
│   ├── css/style.css
│   └── js/
│       ├── main.js
│       └── questionnaire.js        # Auto-proceed on radio select
│
├── src/                            # Core engine
│   ├── engine/
│   │   └── scoringEngine.js        # Filter → Score → Rank → Recommend
│   └── calculator/
│       └── monthlyCostCalculator.js # Fuel + EMI + Insurance + Maintenance
│
└── data/                           # JSON datasets
    ├── cars.json                   # 50 cars (Indian market)
    ├── ownership-costs.json        # Fuel prices + per-car maintenance data
    └── questionnaire.json          # Question definitions + scoring tags
```

---

## Getting Started

### Prerequisites

- Node.js v16+

### Installation

```bash
git clone https://github.com/prashantjawale/CarbuyGuide
cd CarbuyGuide
npm install
```

### Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

### Demo (CLI)

Run the scoring engine directly without the web server:

```bash
npm run demo
```

---

## Routes

| Route                  | Method | Description                            |
| ---------------------- | ------ | -------------------------------------- |
| `/`                    | GET    | Home — paginated car listing (10/page) |
| `/cars/:id`            | GET    | Car detail page                        |
| `/find-my-car`         | GET    | Questionnaire (step by step)           |
| `/find-my-car/answer`  | POST   | Submit answer, proceed to next         |
| `/find-my-car/prev`    | GET    | Go back one question                   |
| `/find-my-car/results` | GET    | Show recommendations                   |
| `/find-my-car/reset`   | GET    | Start over                             |

---

## How the Scoring Works

1. **Filter** — Remove cars that violate hard constraints (budget, fuel type, deal-breakers)
2. **Tag matching** — Each car has `bestFor` tags (e.g. `["city", "safety", "family"]`). User answers generate weighted tags. Score = sum of matched tag weights.
3. **Bonus scoring** — Extra points for high safety rating, good mileage, high user rating
4. **Rank** — Sort by score, return top 5

### Budget Fallback Logic

When no cars match all criteria within budget:

- Shows a **warning banner** explaining the situation
- Displays the **best in-budget car** with a list of which criteria it doesn't meet
- Shows **expanded budget suggestions** (cars that match usage but cost more)

---

## Monthly Cost Calculation

Based on user's daily driving distance:

| Component       | Formula                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **Fuel**        | (daily km × 26 days / mileage) × fuel price                                                        |
| **EMI**         | Standard reducing balance EMI formula                                                              |
| **Insurance**   | ~2.2% of car price annually (year 2+)                                                              |
| **Maintenance** | (service cost / interval km + tyre cost / tyre life km + major service / interval km) × monthly km |

All maintenance costs scale with distance driven — a 100km/day driver sees significantly higher costs than a 20km/day driver for the same car.

---

## Dataset

50 cars covering the Indian market:

- **Price range:** ₹5.5L – ₹45L
- **Body types:** Hatchback, MicroSUV, SUV, Coupe SUV, Sedan, MPV
- **Fuel types:** Petrol, Turbo Petrol, Diesel, Hybrid, Electric, CNG
- **Brands:** Maruti Suzuki, Hyundai, Tata, Kia, Mahindra, Honda, Toyota, Volkswagen, Skoda, MG, Citroen, Renault, Nissan

---

## Design Decisions & Reflections

### What did I build and why?

A usage-based car recommendation engine with monthly ownership cost transparency. The core insight: buyers don't think in filters ("1200cc, petrol, hatchback") — they think in needs ("I drive 40km daily, have a family of 4, and care about safety"). Traditional car platforms force users to learn car jargon before they can search. This flips it — ask about their life, then translate that into car specs behind the scenes.

The monthly cost feature exists because every buyer fixates on the sticker price and ignores the ₹10-15K/month that quietly drains them. A ₹15L car with 15 km/l mileage costs significantly more monthly than a ₹16L hybrid doing 28 km/l — but no platform makes that obvious at decision time.

### What did I deliberately cut?

- **No database** — JSON files are sufficient for 50 cars. Adding MongoDB or Postgres would be over-engineering for a demo.
- **No user authentication** — Sessions handle the questionnaire state. Accounts add complexity without proving the core idea.
- **No image assets** — Car images would need licensing or scraping. The data and logic are what matter here.
- **No React/Vue frontend** — Server-rendered Pug keeps the stack simple, fast to build, and easy to reason about. SPAs are overkill for a form-to-results flow.
- **No comparison view** — Would be the natural next feature, but the core loop (questionnaire → results with cost) needed to work first.
- **No real-time fuel price API** — Hardcoded current prices. Good enough for demo; easy to swap later.
- **Depreciation/resale value** — Meaningful but hard to estimate accurately without historical data. Didn't want to show unreliable numbers.

### What's the tech stack and why?

| Choice                | Why                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js + Express** | Fast to prototype, single language across the stack, great for I/O-light request-response apps                                               |
| **Pug templates**     | Server-side rendering means no build step, no hydration, no client-side routing complexity. Perfect for a multi-page form flow.              |
| **MVC structure**     | Clean separation even in a small project. Models handle data, controllers handle flow, views handle display. Easy to hand off or extend.     |
| **express-session**   | Simplest way to maintain questionnaire state across requests without a DB.                                                                   |
| **Vanilla CSS**       | No Tailwind/Bootstrap — keeps the bundle zero-dependency and the styling fully custom. For 5 pages, a framework adds more weight than value. |
| **JSON data files**   | Acts as a flat-file database. Easy to edit, version control, and understand. No ORM, no migrations, no connection strings.                   |

The guiding principle: **minimum viable stack that proves the idea**. Every dependency earns its place.

### What did I delegate to AI tools vs. do manually?

**Delegated to AI (Kiro):**

- Generating the 50-car dataset with realistic specs, prices, and maintenance costs — this would have taken hours of research manually
- Scaffolding the MVC boilerplate (routes, controllers, views structure)
- Writing the CSS from scratch (layout, cards, responsive grid)
- The EMI calculation formula and monthly cost breakdown logic
- Pug template syntax (I described the layout, AI wrote the markup)

**Done manually (my decisions):**

- The product concept and user flow design (questionnaire → scored results → cost reveal)
- Choosing which questions to ask and how answers map to car tags
- The scoring algorithm design (weighted tag matching + bonuses)
- Budget fallback UX decision (show best-in-budget with unmet criteria vs. just saying "no results")
- Deciding what to cut and what to keep
- Validating the output makes sense (e.g., catching that a ₹24L car shouldn't silently appear in a ₹15L budget)

### Where did the tools help most?

- **Data generation** — Creating 50 realistic car entries with accurate specs, maintenance intervals, and tyre costs would have been the most tedious manual task. AI did it in minutes.
- **Boilerplate velocity** — Going from "I want an MVC Express app with Pug" to a working skeleton with routes, controllers, and styled views happened in one pass.
- **CSS** — Writing responsive card layouts, progress bars, and result pages from scratch is time-consuming. AI handled the visual implementation while I focused on logic.

### Where did they get in the way?

- **Session/cookie testing** — AI-generated curl commands to test the full questionnaire flow kept failing due to session cookie handling quirks between requests. Had to fall back to testing the engine directly via Node scripts. In hindsight, should have written a proper integration test from the start.
- **Budget filter logic** — The initial filter was too lenient (allowing 85% below min budget), which let cheap cars leak into expensive budget ranges. Required manual debugging and a rethink of the fallback strategy.
- **Express 5 compatibility** — The installed version was Express 5 (not 4), which has subtle differences. AI initially wrote patterns assuming v4 behavior.

### If I had another 4 hours, what would I add?

1. **Side-by-side comparison view** — Let users pick 2-3 cars from results and see them in a table with monthly cost as a key column. This is where the "aha, this one is ₹3K/month cheaper" moment happens.

2. **"What if" cost slider** — On the results page, let users drag a slider to change daily km and watch monthly costs update in real-time. Shows how sensitive each car is to driving distance.

3. **Smarter scoring with negative signals** — Currently the engine only rewards matches. It should also penalize mismatches (e.g., recommending a low-ground-clearance sedan to someone who drives on rough roads).

4. **Result persistence via URL** — Encode the questionnaire answers into a shareable URL so users can send their results to family/friends for opinions without re-doing the quiz.

5. **Basic test suite** — Unit tests for the scoring engine and cost calculator. The logic is pure functions, so they're trivially testable — just didn't prioritize it over shipping the working demo.

---

## License

ISC
