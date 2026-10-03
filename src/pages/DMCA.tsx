import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function DMCA() {
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
          <h1 className="text-2xl font-bold text-foreground">DMCA Notice</h1>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Copyright Notice
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              DramaStream respects the intellectual property rights of others
              and expects its users to do the same. We do not host any video
              content on our servers.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Third-Party Content
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All video content is provided through third-party APIs. We act
              solely as an interface to display content that is hosted
              elsewhere.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Filing a DMCA Complaint
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If you believe that content accessible through our service
              infringes your copyright, please contact the original content
              host. For issues specific to our service, contact us with the
              following information:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              <li>
                A description of the copyrighted work claimed to be infringed
              </li>
              <li>The URL of the allegedly infringing content</li>
              <li>Your contact information</li>
              <li>
                A statement that you have a good faith belief that the use is
                not authorized
              </li>
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-foreground">
              Response Time
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We will respond to valid DMCA notices within 48 hours and take
              appropriate action as needed.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
