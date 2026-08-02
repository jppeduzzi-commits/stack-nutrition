# Stack Nutrition — project brief

This is the working spec for Stack Nutrition, assembled from planning conversation before any code was written.

## What this is

Stack Nutrition is a macro and calorie tracker for whole foods, cooked at home. It differs from a typical tracker in one key way: instead of logging what you ate and reading off a resulting calorie count, you tell it what you're going to eat and it tells you how much of each food to eat, in grams, to hit your targets exactly. The core mechanic is a meal builder that solves for portion sizes given a set of chosen foods and a macro target, rather than a passive log.

Scope for version one is intentionally narrow: whole foods only (meat, rice, vegetables, oats, and so on, the things you buy raw and cook yourself), plus a small allowance for simple packaged exceptions like whey protein powder. No barcode scanning, no restaurant or branded food entries, no micronutrient tracking yet. Grams are the only unit.

## Daily targets

Version one uses manual entry rather than a BMR or TDEE calculator (that can come later). The user enters body weight, lean body mass, a protein target expressed as grams per pound of lean body mass, a fat percentage of total daily calories, and a total daily calorie target. From those, protein grams are proteinRatio * LBM, fat grams are (fatPct / 100 * calories) / 9, and carb grams are whatever calories remain after protein and fat, divided by 4. All of these are user-adjustable after the fact, not locked once calculated.

Example values used while prototyping (illustrative, not necessarily final): 2500 calories, 200 lb body weight, 178 lb lean body mass, 1.5 g protein per lb LBM, 30% fat.

## Timeline and meals

The app lays out a default day timeline (roughly 6am to 10pm, user-adjustable), and the user places meals on it — however many they want, named and timed however they like (breakfast, lunch, pre-workout, post-workout, dinner, and so on). Each meal is assigned a percentage of the day's total calories and macros, set manually by the user per meal (not an even split), and the UI should enforce that percentages across all meals sum to 100.

## Meal builder — the core algorithm

This is the differentiating piece. Each meal has three primary food slots: one primary protein source, one primary carb source, one primary fat source. Because real foods rarely contain only one macronutrient (chicken has some fat, rice has some protein), the app solves a system of three linear equations for the three unknown gram amounts, rather than assuming each food is purely one macro.

Given a meal's target grams of protein (P), carb (C), and fat (F), and three chosen foods with known macro grams per gram of food (p1,c1,f1 for the protein-role food, p2,c2,f2 for the carb-role food, p3,c3,f3 for the fat-role food), solve for x1, x2, x3 (grams of each food):

p1*x1 + p2*x2 + p3*x3 = P
c1*x1 + c2*x2 + c3*x3 = C
f1*x1 + f2*x2 + f3*x3 = F

This is solved via Cramer's rule (determinant of the 3x3 macro matrix, with each column swapped for the target vector in turn). See prototype_logic.js for a working implementation.

A meal can also include any number of fixed-quantity extras (a side of broccoli, a fixed amount of olive oil) where the user sets the grams by hand. Extras are not solved for — their macro contribution is subtracted from the meal's target before solving for the three primaries, so the primaries absorb whatever's left.

If the three chosen primary foods can't hit the target with all-positive gram amounts (the linear system returns a negative value for one food), the app should flag this clearly and let the user swap a food, rather than silently guessing or clamping to zero. This was a deliberate decision: fail loud, not quiet.

## Food data

Source: USDA FoodData Central, public domain (CC0), no attribution legally required but the app should credit USDA FoodData Central somewhere (about page or settings). Foundation Foods is the primary dataset (smaller, lab-verified, genuinely raw/minimally-processed ingredients). SR Legacy is a secondary, optional source for staples not yet covered by Foundation Foods (cooked rice, cooked pasta, and other common cooked-state entries) — it's older (2018) and broader, so entries pulled from it are worth a manual sanity check before adding to the database.

A conversion script, usda_to_stack_nutrition.py, is included below. It parses the USDA bulk JSON downloads and outputs a clean {id, name, p, c, f} list per food (p/c/f as grams of that macro per gram of food, matching what the solver needs directly), auto-sorted into protein/carb/fat roles by whichever macro carries the most calories. This needs a manual pass afterward for foods that straddle roles (eggs, dairy, legumes).

## Visual style

Black and white, clean and simple, minimal — the same aesthetic as the Stack Training app. No color by default. The one exception is small, consistent color coding for macro categorization: a distinct color each for protein, carb, and fat labels/badges, used consistently everywhere those roles appear (meal builder food slots, daily summary cards, timeline). No colors for micronutrients yet since they're out of scope for v1. No decorative color otherwise.

## Recommended stack

Next.js (React) for the frontend. Vercel for hosting, connected to GitHub for automatic deploys on push. Firebase for auth and data storage (Firestore) — user profile, daily targets, meals, and the food database can all live there, or the food database can just be a bundled static JSON file loaded client-side since it doesn't change per-user. GitHub for source control throughout.

## Suggested build order

Start by scaffolding a Next.js app and porting the prototype's UI and solver logic as a local-only client-side app with a small hardcoded food list (no backend yet) — this gets the core interaction feel right fast. Next, wire up Firebase auth and Firestore to persist a user's daily targets and meal plan across sessions. Then swap the hardcoded food list for the real USDA-derived database. After that, polish the UI to match the Stack Training visual style precisely. Last, connect the GitHub repo to Vercel for deployment.
