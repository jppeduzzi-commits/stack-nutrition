// Identity is first + last name for now (no password), remembered per device.
// Swapping in real sign-in later only needs to change what id gets returned.
const LS_KEY = "stack_nutrition_person";

const tidy = (s) => String(s || "").normalize("NFC").trim().replace(/\s+/g, " ");
const slug = (s) => tidy(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");

// "_" joins the two parts and can't appear inside either one, so
// "Mary Ann" + "Lee" and "Mary" + "Ann Lee" stay different people.
export function makePerson(first, last) {
  const a = slug(first), b = slug(last);
  if (!a || !b) return null;
  return { id: `${a}_${b}`, firstName: tidy(first), lastName: tidy(last) };
}

export function loadPerson() {
  try {
    const p = JSON.parse(localStorage.getItem(LS_KEY));
    return p ? makePerson(p.firstName, p.lastName) : null;
  } catch {
    return null;
  }
}

export function rememberPerson(person) {
  if (person) localStorage.setItem(LS_KEY, JSON.stringify(person));
  else localStorage.removeItem(LS_KEY);
}
