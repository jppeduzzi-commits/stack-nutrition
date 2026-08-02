import { db } from "./firebase";
import { doc, getDoc, setDoc, getDocs, deleteDoc, collection } from "firebase/firestore";

// Firestore paths:
//   users/{uid}              → { inputs, targets, dayRange, updatedAt }
//   users/{uid}/meals/{id}   → { id, name, time, pctOfDay, proteinFood, carbFood, fatFood, extras, updatedAt }
//
// uid comes from Firebase Anonymous Auth -- one implicit user per device.

export async function fbLoadUser(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function fbSaveUser(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.error(e);
  }
}

export async function fbLoadMeals(uid) {
  try {
    const snap = await getDocs(collection(db, "users", uid, "meals"));
    return snap.docs.map((d) => d.data());
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function fbSaveMeal(uid, meal) {
  try {
    await setDoc(doc(db, "users", uid, "meals", meal.id), { ...meal, updatedAt: Date.now() });
  } catch (e) {
    console.error(e);
  }
}

export async function fbDeleteMeal(uid, mealId) {
  try {
    await deleteDoc(doc(db, "users", uid, "meals", mealId));
  } catch (e) {
    console.error(e);
  }
}
