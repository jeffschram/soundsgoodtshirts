import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Get in Touch</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Have a question about your order or want to suggest a new design?
            We'd love to hear from you.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-sm font-semibold">Email</h3>
              <a
                href="mailto:hello@soundsgoodtshirts.com"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                hello@soundsgoodtshirts.com
              </a>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                We typically respond within 24 hours
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
            <CardDescription>
              We'll get back to you as soon as we can.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Your Name</Label>
                <Input id="contact-name" name="name" type="text" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Your Email</Label>
                <Input id="contact-email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Your Message</Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
