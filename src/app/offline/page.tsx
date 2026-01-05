import Link from "next/link";
import { WifiOff, Download, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-background">
      <div className="p-6 rounded-full bg-muted mb-6">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>

      <p className="text-muted-foreground max-w-md mb-8">
        It looks like you&apos;ve lost your internet connection. Don&apos;t
        worry - you can still access your downloaded content.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link href="/settings/offline">
            <Download className="w-4 h-4 mr-2" />
            View Downloads
          </Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Try Home Page
          </Link>
        </Button>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          We&apos;ll automatically reconnect when your connection is restored.
        </p>
      </div>
    </div>
  );
}
