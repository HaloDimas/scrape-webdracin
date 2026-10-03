import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background pb-safe pt-4">
      <div className="px-4">
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/more"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Terms of Service
          </h1>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-muted-foreground">Last updated: December 2024</p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Acceptance of Terms
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              By accessing and using DramaStream, you agree to be bound by these
              Terms of Service.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Service Description
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              DramaStream is a free, ad-supported streaming service that
              provides access to drama content through third-party APIs. We do
              not host any video content on our servers.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              User Conduct
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Users agree not to misuse the service, attempt to circumvent
              advertisements, or use the service for any illegal purposes.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Disclaimer
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The service is provided "as is" without warranties of any kind. We
              are not responsible for the content provided through third-party
              APIs.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Changes to Terms
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued
              use of the service constitutes acceptance of any changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
