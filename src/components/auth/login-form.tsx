'use client';

import { signIn } from 'next-auth/react';
import { FileText, Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

interface LoginFormProps {
  error?: string;
}

export function LoginForm({ error }: LoginFormProps) {
  return (
    <div className="dark-dashboard flex min-h-screen bg-background text-foreground">
      {/* Left side — branding */}
      <div className="hidden flex-1 flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">Smart Doc Reader</span>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-foreground">
            Extract financial data
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              with AI precision
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload invoices, receipts, and financial documents. Our AI extracts vendor info,
            amounts, dates, and line items automatically.
          </p>

          <div className="space-y-4 pt-4">
            <Feature
              icon={<Sparkles className="h-4 w-4 text-purple-400" />}
              title="AI-Powered Extraction"
              description="Gemini Vision reads and extracts data from any document format"
            />
            <Feature
              icon={<Zap className="h-4 w-4 text-amber-400" />}
              title="Instant Processing"
              description="Upload and get results in seconds, not hours"
            />
            <Feature
              icon={<Shield className="h-4 w-4 text-green-400" />}
              title="Secure & Private"
              description="Your documents are encrypted and never shared"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 Smart Doc Reader. All rights reserved.
        </p>
      </div>

      {/* Right side — login form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:max-w-md lg:border-l lg:border-border">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Smart Doc Reader</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-center text-sm text-destructive">
                Something went wrong. Please try again.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-3 border-border bg-card text-foreground hover:bg-muted"
              onClick={() => signIn('github')}
            >
              <GithubIcon className="h-5 w-5" />
              Continue with GitHub
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">
                Secure authentication via OAuth
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
