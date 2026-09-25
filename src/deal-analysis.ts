/** Decimal-string arithmetic only. MAO is rounded once to cents, half away from zero. */
const TEN = BigInt(10);
const HUNDRED = BigInt(100);
function decimal(value: string) {
  if (!/^\d+(\.\d+)?$/.test(value) || value.length > 80) throw new Error("Invalid decimal.");
  const [whole, fraction = ""] = value.split(".");
  return { units: BigInt(whole + fraction), scale: TEN ** BigInt(fraction.length) };
}
export function canonicalDecimal(value: string) {
  decimal(value);
  const [whole, fraction = ""] = value.split(".");
  const tail = fraction.replace(/0+$/, "");
  return BigInt(whole).toString() + (tail ? "." + tail : "");
}
export function analysisMoney(value: string): string | null {
  if (!value.trim()) return null;
  const normalized = canonicalDecimal(value.trim());
  if (!/^\d{1,24}(\.\d{1,2})?$/.test(normalized)) throw new Error("Use a non-negative dollar amount with at most two decimal places.");
  return normalized;
}
export function percentage(value: string): string | null {
  const normalized = analysisMoney(value);
  if (normalized === null) return null;
  const parsed = decimal(normalized);
  if (parsed.units <= BigInt(0) || parsed.units > HUNDRED * parsed.scale) throw new Error("Buyer percentage must be greater than 0 and at most 100.");
  return normalized;
}
function rounded(numerator: bigint, denominator: bigint) {
  const negative = numerator < BigInt(0);
  const abs = negative ? -numerator : numerator;
  const amount = (abs + denominator / BigInt(2)) / denominator;
  return negative ? -amount : amount;
}
export function centsString(cents: bigint) {
  const abs = cents < BigInt(0) ? -cents : cents;
  return (cents < BigInt(0) ? "-" : "") + (abs / HUNDRED).toString() + "." + (abs % HUNDRED).toString().padStart(2, "0");
}
export function formatMoney(value: string | null) {
  if (value === null) return "Not entered";
  const negative = value.startsWith("-");
  const parsed = decimal(negative ? value.slice(1) : value);
  const fixed = centsString(rounded(parsed.units * HUNDRED, parsed.scale));
  const [whole, fraction] = fixed.split(".");
  return (negative ? "−" : "") + "$" + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + fraction;
}
export type Analysis = {
  askingPrice: string | null; arv: string | null; repairEstimate: string | null;
  assignmentFee: string | null; buyerPercentage: string | null;
};
export function calculateAnalysis(data: Analysis) {
  if (data.arv === null || data.repairEstimate === null || data.assignmentFee === null || data.buyerPercentage === null) return null;
  const a = decimal(data.arv), p = decimal(data.buyerPercentage), r = decimal(data.repairEstimate), f = decimal(data.assignmentFee);
  if (p.units <= BigInt(0) || p.units > HUNDRED * p.scale) return null;
  const denominator = a.scale * p.scale * HUNDRED * r.scale * f.scale;
  const numerator = a.units * p.units * r.scale * f.scale -
    r.units * a.scale * p.scale * HUNDRED * f.scale -
    f.units * a.scale * p.scale * HUNDRED * r.scale;
  const maoCents = rounded(numerator * HUNDRED, denominator);
  const asking = data.askingPrice === null ? null : decimal(data.askingPrice);
  const difference = asking === null ? null : rounded(asking.units * HUNDRED, asking.scale) - maoCents;
  return { mao: centsString(maoCents), difference: difference === null ? null : centsString(difference),
    position: difference === null ? null : difference > BigInt(0) ? "above" : difference < BigInt(0) ? "below" : "equal" };
}
export function sameDecimal(a: string | null | undefined, b: string | null | undefined) {
  return a == null || b == null ? a == b : canonicalDecimal(a) === canonicalDecimal(b);
}
