import { Button } from "@/components/ui/button"
import { Chrome, Zap, MessageSquare, Wrench, ArrowRight, Sparkles, Bot, Code } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">N8N Insider</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
              How it Works
            </Link>
            <Link
              href="https://templates.n8ninsider.com"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Templates
            </Link>
          </nav>
          <Button asChild className="btn-shine">
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Chrome className="h-4 w-4" />
              Install Extension
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="mb-6 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered n8n Assistant</span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            Your AI Copilot for{" "}
            <span className="gradient-text">n8n Workflows</span>
          </h1>

          <p className="mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Debug faster, build smarter. Get instant AI-powered help right inside your n8n editor
            with our Chrome extension. Ask questions, fix errors, and optimize your workflows.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="xl" className="btn-shine gap-2" asChild>
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Chrome className="h-5 w-5" />
                Install Chrome Extension
              </a>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="https://templates.n8ninsider.com">
                Browse Templates
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Free to use. No credit card required.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24 bg-pattern">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 md:text-4xl">
            Everything You Need to Master n8n
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI assistant understands n8n inside and out, helping you build
            better workflows faster.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="AI Chat Assistant"
            description="Ask questions about your workflow in natural language. Get instant, context-aware answers."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Instant Debugging"
            description="Paste error messages and get step-by-step solutions. Our AI analyzes your workflow context."
          />
          <FeatureCard
            icon={<Wrench className="h-6 w-6" />}
            title="Fix It For Me"
            description="One-click fixes. The AI can modify your workflow directly to resolve issues (Pro feature)."
          />
          <FeatureCard
            icon={<Code className="h-6 w-6" />}
            title="Code Generation"
            description="Generate JavaScript/Python code snippets for Function nodes with proper error handling."
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title="Smart Suggestions"
            description="Get recommendations for optimizing your workflows and best practices."
          />
          <FeatureCard
            icon={<Bot className="h-6 w-6" />}
            title="Vision Analysis"
            description="Take screenshots of your workflow. The AI sees exactly what you see."
          />
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 md:text-4xl">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in under a minute. No complicated setup required.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          <StepCard
            number="1"
            title="Install Extension"
            description="Add the N8N Insider extension to Chrome from the Web Store."
          />
          <StepCard
            number="2"
            title="Open n8n"
            description="Navigate to your n8n instance and open any workflow."
          />
          <StepCard
            number="3"
            title="Start Chatting"
            description="Click the extension icon and ask your first question. It's that simple."
          />
        </div>
      </section>

      {/* Templates CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="rounded-2xl bg-primary p-8 md:p-12 text-center text-white glow">
          <h2 className="text-3xl font-bold mb-4 md:text-4xl">
            Need Pre-Built Workflows?
          </h2>
          <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
            Browse our library of 1000+ ready-to-use n8n templates.
            From simple automations to complex AI workflows.
          </p>
          <Button size="xl" variant="secondary" asChild>
            <Link href="https://templates.n8ninsider.com">
              Browse Templates
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4 md:text-4xl">
          Ready to Supercharge Your n8n Workflows?
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of n8n users who are building faster with AI assistance.
        </p>
        <Button size="xl" className="btn-shine gap-2" asChild>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Chrome className="h-5 w-5" />
            Get the Chrome Extension
          </a>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">N8N Insider</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="https://templates.n8ninsider.com" className="hover:text-foreground">
                Templates
              </Link>
              <a href="mailto:support@n8ninsider.com" className="hover:text-foreground">
                Support
              </a>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} N8N Insider. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({
  number,
  title,
  description
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
        {number}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
