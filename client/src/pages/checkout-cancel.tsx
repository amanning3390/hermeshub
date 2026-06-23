import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function CheckoutCancel() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <XCircle className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Checkout cancelled</h1>
          <p className="text-sm text-muted-foreground">
            No charge was made. You can return to the work request and settle whenever you're ready.
          </p>
          <Link href="/work">
            <Button variant="outline">Back to Work Board</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
