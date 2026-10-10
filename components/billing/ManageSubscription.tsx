// Opens the Stripe customer portal: card, invoices, monthly/yearly, cancel.
export function ManageSubscription() {
  return (
    <form action="/api/billing/portal" method="POST">
      <button className="btn btn-secondary">Manage subscription</button>
    </form>
  )
}
