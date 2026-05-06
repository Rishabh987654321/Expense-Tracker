import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  ChartPie,
  Workflow,
  Receipt,
  Building2,
  Users,
  Upload,
  Mail,
  LockKeyhole,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/layout/Footer";

const features = [
  {
    icon: LockKeyhole,
    title: "Database-enforced tenant isolation (RLS)",
    description:
      "Every row is scoped to an organization and protected by PostgreSQL Row-Level Security. Even a buggy query can’t leak data across companies.",
  },
  {
    icon: Receipt,
    title: "Receipt-first expense capture",
    description:
      "Submit expenses in seconds. Attach a JPG/PNG/WEBP/PDF receipt that uploads to Azure Blob and is viewed via short-lived signed links.",
  },
  {
    icon: Workflow,
    title: "Approval workflow",
    description:
      "Employees submit → managers review → approve/reject with optional notes. Every decision is recorded and visible in the expense timeline.",
  },
  {
    icon: ChartPie,
    title: "Spending analytics",
    description:
      "Dashboards show approved spend by month, category breakdown, and top spenders—filtered per-tenant and permissioned by role.",
  },
  {
    icon: Mail,
    title: "Async notifications",
    description:
      "Emails are sent asynchronously via BullMQ + Redis so user actions stay fast. SendGrid delivers invites and approval notifications.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV export",
    description:
      "Export filtered expense reports to CSV for finance workflows and audits. Designed for managers/admins.",
  },
];

const steps = [
  {
    icon: Building2,
    title: "Create an organization",
    description:
      "Pick a slug and you’ll get a dedicated subdomain (e.g. acme.localhost).",
  },
  {
    icon: Users,
    title: "Invite your team",
    description:
      "Admins invite members via email link and assign roles: Admin, Manager, Employee.",
  },
  {
    icon: Upload,
    title: "Submit expenses + receipts",
    description:
      "Employees submit expenses with category tags and optional receipt uploads.",
  },
  {
    icon: ShieldCheck,
    title: "Approve + analyze",
    description:
      "Managers approve/reject and track spend analytics — all isolated per company.",
  },
];

const demoTenants = [
  {
    slug: "acme",
    label: "Acme Corp (demo)",
    href: "http://acme.localhost:5173/login",
  },
  {
    slug: "globex",
    label: "Globex Inc (demo)",
    href: "http://globex.localhost:5173/login",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-semibold">
              ET
            </div>
            <div className="leading-tight">
              <div className="font-semibold">Expense Tracker</div>
              <div className="text-xs text-muted-foreground">
                Multi-tenant SaaS 
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup" className="flex items-center">
                Create org
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-muted blur-3xl opacity-60" />
          </div>

          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="max-w-xl">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">B2B expense management</Badge>
                  <Badge variant="outline">Subdomain tenants</Badge>
                  <Badge variant="outline">Postgres RLS</Badge>
                </div>

                <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight font-heading">
                  Expense approvals, receipts, and analytics — built for multi-tenant
                  teams.
                </h1>
                <p className="mt-4 text-muted-foreground text-lg">
                  Create an organization, invite teammates, submit expenses with
                  receipts, and review approvals in one dashboard. Each company is
                  isolated at the database level using PostgreSQL Row‑Level
                  Security.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Button asChild size="lg">
                    <Link to="/signup" className="flex items-center">
                      Create your organization
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/login">Sign in to an existing org</Link>
                  </Button>
                </div>

                <div className="mt-6 text-xs text-muted-foreground">
                  Tip: for the demo, try{" "}
                  <span className="font-mono">acme.localhost</span> and{" "}
                  <span className="font-mono">globex.localhost</span> to see strict
                  isolation.
                </div>
              </div>

              <Card className="border-muted">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Demo tenants</div>
                      <div className="text-xs text-muted-foreground">
                        Two companies with fully isolated data
                      </div>
                    </div>
                    <Badge variant="secondary">RLS enabled</Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    {demoTenants.map((t) => (
                      <a
                        key={t.slug}
                        href={t.href}
                        className="block rounded-lg border bg-card hover:bg-accent/40 transition-colors p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{t.label}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {t.slug}.localhost:5173
                            </div>
                          </div>
                          <ArrowRight className="size-4 text-muted-foreground mt-0.5" />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div className="rounded-md bg-muted px-2 py-1 text-center">
                            Admin
                          </div>
                          <div className="rounded-md bg-muted px-2 py-1 text-center">
                            Manager
                          </div>
                          <div className="rounded-md bg-muted px-2 py-1 text-center">
                            Employee
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    Seeded users use password{" "}
                    <span className="font-mono">password123</span>.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight font-heading">
                How it works
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A simple flow that still demonstrates real SaaS fundamentals:
                multi‑tenancy, RBAC, file uploads, background jobs, and analytics.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <Card key={s.title} className="border-muted">
                  <CardContent className="p-6">
                    <s.icon className="size-5" />
                    <h3 className="mt-3 font-medium">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold tracking-tight font-heading">
                  Built like a real SaaS
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  This project isn’t just UI — the backend enforces isolation,
                  roles, and audit-friendly workflows.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/login">Try a demo tenant</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Create your org</Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <Card key={f.title} className="border-muted">
                  <CardContent className="p-6">
                    <f.icon className="size-5 text-foreground" />
                    <h3 className="mt-3 font-medium">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
