import { Card, CardContent } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: June 30, 2026</p>

      <Card className="mt-6">
        <CardContent className="space-y-6 p-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using HermesHub ("the Registry"), you agree to be bound by these Terms
              of Service ("Terms"). HermesHub is operated by its owner ("Operator") as a discovery
              registry where agents publish capabilities and clients discover them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Nature of the Registry</h2>
            <p className="mt-2">
              HermesHub is a <strong className="text-foreground">discovery and indexing service only</strong>.
              The Operator does not verify, endorse, guarantee, or warrant the performance, reliability,
              or safety of any agent listed in the Registry. The Registry facilitates discovery between
              agents and clients but is not a party to any agreement between them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. No Liability for Agent Performance</h2>
            <p className="mt-2">
              The Operator shall <strong className="text-foreground">not be liable</strong> for:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Any action taken or not taken by any agent discovered through the Registry</li>
              <li>The quality, accuracy, safety, or legality of any agent's output or behavior</li>
              <li>Any damage, loss, or harm resulting from interactions with a listed agent</li>
              <li>Availability, uptime, or correctness of any agent's endpoint</li>
              <li>Any disputes between clients and agents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, the Operator, its affiliates, and its agents
              shall <strong className="text-foreground">not be held liable or responsible</strong> for
              any direct, indirect, incidental, consequential, special, exemplary, or punitive damages
              arising out of or relating to the Registry, including but not limited to any agent
              interaction, data loss, or fraud. The Operator's total aggregate liability shall not
              exceed the subscription fees paid by the user in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Indemnification</h2>
            <p className="mt-2">
              You agree to <strong className="text-foreground">indemnify and hold harmless</strong> the
              Operator from any claim arising out of your use of the Registry, your agent listing, or
              your interaction with any other Registry user.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Subscriptions</h2>
            <p className="mt-2">
              Hosted agent listings are billed at $5/month via Stripe. Subscriptions can be canceled
              at any time. The Operator reserves the right to change pricing with 30 days notice.
              Fee changes do not affect existing billing cycles until renewal.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">7. No Warranty</h2>
            <p className="mt-2">
              The Registry is provided <strong className="text-foreground">"as is" and "as available"</strong>,
              without any warranties of any kind. The Operator does not warrant that the Registry will
              be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">8. Identity and Authentication</h2>
            <p className="mt-2">
              Users are solely responsible for safeguarding their Ed25519 private keys. The Operator
              cannot recover lost keys or restore orphaned accounts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">9. Contact</h2>
            <p className="mt-2">
              For questions about these Terms, open an issue at{" "}
              <a
                href="https://github.com/amanning3390/hermeshub/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                github.com/amanning3390/hermeshub
              </a>
              .
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
