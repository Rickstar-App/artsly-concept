/**
 * THE PAYMENT SEAM — PRD §43.6.
 *
 * "Checkout calls createRental() / createPurchase() server actions that
 *  internally call processPayment(amountCents, metadata). In the MVP that
 *  function returns { ok: true, simulated: true } immediately. SWAPPING IN
 *  STRIPE LATER TOUCHES EXACTLY THAT ONE FUNCTION. Do not scatter
 *  simulated-payment logic through the UI."
 *
 * §42 — "No raw payment data is collected, stored, or logged — checkout is
 * simulated and HAS NO CARD FIELDS AT ALL." There is no card model in this
 * codebase, deliberately.
 */

export interface PaymentMetadata {
  kind: 'rental' | 'purchase' | 'subscription'
  artworkId?: string
  subscriptionId?: string
  months?: number
}

export interface PaymentResult {
  ok: boolean
  simulated: true
  reference: string
  error?: string
}

export async function processPayment(
  amountCents: number,
  metadata: PaymentMetadata,
): Promise<PaymentResult> {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    return { ok: false, simulated: true, reference: '', error: 'Invalid amount.' }
  }
  return {
    ok: true,
    simulated: true,
    reference: `sim_${metadata.kind}_${Date.now().toString(36)}`,
  }
}
