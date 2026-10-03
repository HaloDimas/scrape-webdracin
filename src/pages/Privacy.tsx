import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacy() {
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
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-muted-foreground">Last updated: December 2024</p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Information We Collect
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We use local storage on your device to save your preferences,
              watch history, and favorites. This data never leaves your device.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We use cookies for analytics and advertising purposes through
              Google AdSense. These cookies help us understand how users
              interact with our service.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Third-Party Services
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This service uses Google AdSense for advertising. Google may use
              cookies to serve ads based on your prior visits to this or other
              websites.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Data Security
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We prioritize the security of your data. All data is stored
              locally on your device and is not transmitted to our servers.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If you have any questions about this Privacy Policy, please
              contact us.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
