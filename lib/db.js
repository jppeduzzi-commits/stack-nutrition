import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc, deleteField, collection, query, orderBy, limit } from "firebase/firestore";

// Firestore paths:
//   people/{personId}              → { firstName, lastName, inputs, targets, trainingTime, carbTiming, updatedAt }
//   people/{personId}/meals/{id}   → { id, name, pctOfDay, proteinFood, carbFood, fatFood, extras, updatedAt }
//   people/{personId}/days/{date}  → { date, targets, entries: { [id]: { id, name, mealId, loggedAt, items } }, updatedAt }
//   users/{uid}[/meals/{id}]       → legacy per-device data, copied once by fbOpenPerson
//
// entries is a map keyed by id so two devices logging at once don't
// overwrite each other. targets is that day's own copy, so changing your
// targets later doesn't rewrite how past days measured up.
//
// Everything here throws on failure. Treating a failed load as "no data"
// would reseed defaults over a real plan.

const personRef = (id) => doc(db, "people", id);
const mealsCol = (id) => collection(db, "people", id, "meals");
const dayRef = (id, date) => doc(db, "people", id, "days", date);

export async function fbPersonExists(personId) {
  return (await getDoc(personRef(personId))).exists();
}

// Early versions saved these sample numbers for every device, so finding them
// untouched means targets were never actually set.
function isOldSample({ inputs: i, targets: t }) {
  return (
    !!i && !!t &&
    i.calories === 2500 && i.bodyWeight === 200 && i.lbm === 178 && i.proteinRatio === 1.5 && i.fatPct === 30 &&
    t.calories === 2500 && t.proteinG === 267 && Math.abs(t.fatG - 2500 / 30) < 0.01 && Math.abs(t.carbG - 170.5) < 0.01
  );
}

// Creates the person if new, carrying over this device's pre-name data once.
export async function fbOpenPerson(person, uid) {
  if (await fbPersonExists(person.id)) return;
  const legacyRef = doc(db, "users", uid);
  const legacy = (await getDoc(legacyRef)).data();
  const carry = legacy && !legacy.migratedTo;
  if (carry) {
    const meals = await getDocs(collection(db, "users", uid, "meals"));
    await Promise.all(meals.docs.map((d) => setDoc(doc(mealsCol(person.id), d.id), d.data())));
  }
  const profile = carry ? { ...legacy } : {};
  if (isOldSample(profile)) {
    delete profile.inputs;
    delete profile.targets;
  }
  // Written after the meals, so an interrupted copy is retried, not skipped.
  await setDoc(personRef(person.id), {
    ...profile,
    firstName: person.firstName,
    lastName: person.lastName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  if (carry) await setDoc(legacyRef, { migratedTo: person.id }, { merge: true });
}

export async function fbLoadPerson(personId) {
  const snap = await getDoc(personRef(personId));
  return snap.exists() ? snap.data() : null;
}

export const fbSavePerson = (personId, data) =>
  setDoc(personRef(personId), { ...data, updatedAt: Date.now() }, { merge: true });

export async function fbLoadMeals(personId) {
  const meals = (await getDocs(mealsCol(personId))).docs.map((d) => d.data());
  // Ids start with their creation time, so this is meal order.
  return meals.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
}

export const fbSaveMeal = (personId, meal) =>
  setDoc(doc(mealsCol(personId), meal.id), { ...meal, updatedAt: Date.now() });

export const fbDeleteMeal = (personId, mealId) => deleteDoc(doc(mealsCol(personId), mealId));

export async function fbLoadRecentDays(personId, count = 90) {
  const snap = await getDocs(query(collection(db, "people", personId, "days"), orderBy("date", "desc"), limit(count)));
  return snap.docs.map((d) => d.data());
}

export async function fbLoadDay(personId, date) {
  const snap = await getDoc(dayRef(personId, date));
  return snap.exists() ? snap.data() : null;
}

export const fbSaveEntry = (personId, date, targets, entry) =>
  setDoc(dayRef(personId, date), { date, targets, entries: { [entry.id]: entry }, updatedAt: Date.now() }, { merge: true });

export const fbDeleteEntry = (personId, date, entryId) =>
  updateDoc(dayRef(personId, date), { [`entries.${entryId}`]: deleteField(), updatedAt: Date.now() });
