# Stack Nutrition

A macro and calorie tracker for whole foods, cooked at home. Instead of logging what you ate, you tell it what you're going to eat and it solves for how much of each food (in grams) to hit your macro targets exactly.

See [STACK_NUTRITION_SPEC.md](./STACK_NUTRITION_SPEC.md) for the full project brief.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) + React, deployed on Vercel, Firebase (Auth + Firestore) for persistence. Food data sourced from [USDA FoodData Central](https://fdc.nal.usda.gov) (CC0) via `usda_to_stack_nutrition.py`.
