export const TUSDC_DECIMALS = 6;
export const TUSDC_UNIT = 1_000_000n;

export function formatTokenUnits(raw: bigint, decimals = TUSDC_DECIMALS): string {
  const unit = 10n ** BigInt(decimals);
  const whole = raw / unit;
  const fraction = (raw % unit).toString().padStart(decimals, '0');
  return `${whole.toString()}.${fraction}`;
}

/** Select custom token balances while excluding the native token entry. */
export function findCustomTokenBalance(
  balances: Record<string, bigint>,
  nativeToken: string,
  configuredColor?: string,
): { tokenColor: string; raw: bigint } {
  if (configuredColor) return { tokenColor: configuredColor, raw: balances[configuredColor] ?? 0n };
  const entry = Object.entries(balances).find(([color]) => color !== nativeToken);
  return entry ? { tokenColor: entry[0], raw: entry[1] } : { tokenColor: 'unresolved', raw: 0n };
}
