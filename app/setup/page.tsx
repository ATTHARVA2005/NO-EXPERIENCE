"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Copy, ArrowRight } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function SetupPage() {
  const [copied, setCopied] = useState("")

  const testEmail = "tamoceo@ceo.com"
  const testPassword = "tamoop"

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(""), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <Card className="border-muted/30 bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Initial Setup - Create Test Account
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Follow these steps to set up the test account and start using EduAgent
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold mb-2">Go to Supabase Dashboard</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Open your Supabase project and navigate to Authentication Users section.
                  </p>
                  <Button
                    variant="outline"
                    className="border-muted/30 hover:border-primary text-foreground w-full sm:w-auto bg-transparent"
                    onClick={() => {
                      window.open("https://supabase.com/dashboard", "_blank")
                    }}
                  >
                    Open Supabase Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold mb-2">Run Database Schema</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Go to SQL Editor in Supabase and run the schema setup script to create all tables.
                  </p>
                  <Button
                    variant="outline"
                    className="border-muted/30 hover:border-primary text-foreground w-full sm:w-auto bg-transparent"
                    onClick={() => {
                      window.open("https://supabase.com/dashboard", "_blank")
                    }}
                  >
                    Go to SQL Editor
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold mb-2">Click Add User in Supabase</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    In the Users section, click the "Add user" button in the top right.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold mb-4">Enter Test Credentials</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-slate-800 border border-muted/30 rounded text-foreground font-mono text-sm">
                          {testEmail}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-muted/30 hover:border-primary text-foreground bg-transparent"
                          onClick={() => copyToClipboard(testEmail, "email")}
                        >
                          <Copy className="w-4 h-4" />
                          {copied === "email" ? "Copied!" : ""}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Password</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-slate-800 border border-muted/30 rounded text-foreground font-mono text-sm">
                          {testPassword}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-muted/30 hover:border-primary text-foreground bg-transparent"
                          onClick={() => copyToClipboard(testPassword, "password")}
                        >
                          <Copy className="w-4 h-4" />
                          {copied === "password" ? "Copied!" : ""}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold mb-2">Verify Email & Save</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Check the "Email confirmed at" checkbox to verify the email, then click "Save user"
                  </p>
                </div>
              </div>
            </div>

            {/* Final Step */}
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-300">
                  <p className="font-semibold mb-2">You're all set!</p>
                  <p>Return here and click "Go to Login" to sign in with tamoceo@ceo.com / tamoop</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/login" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Go to Login</Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-muted/30 hover:border-primary text-foreground bg-transparent"
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
          <p className="font-semibold mb-2">Quick Summary:</p>
          <ul className="space-y-1 text-blue-400/80">
            <li>• Database schema creates tables for students, sessions, assessments, etc.</li>
            <li>• Test account allows you to explore the full EduAgent experience</li>
            <li>• Student profile is auto-created on first login</li>
            <li>• You can then sign up additional accounts freely</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
