"use client";

import { Suspense, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import {
  Settings,
  Bell,
  Shield,
  Paintbrush,
  Globe,
  Bot,
  Key,
  Database,
  Users,
  Save,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useTheme, type Theme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  usePageTitle("Settings");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "ai", label: "AI Providers" },
    { id: "notifications", label: "Notifications" },
    { id: "data", label: "Data" },
    { id: "security", label: "Security" },
  ];

  const tabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel of your workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Choose between light, dark, or system theme</p>
                  </div>
                  <Select
                    options={[
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                      { value: "system", label: "System" },
                    ]}
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as Theme)}
                    className="w-36"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Compact Mode</p>
                    <p className="text-xs text-muted-foreground">Reduce spacing for a denser layout</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sidebar Collapsed</p>
                    <p className="text-xs text-muted-foreground">Start with sidebar collapsed by default</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Language & Region</CardTitle>
                <CardDescription>Configure your preferred language and regional settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Language</p>
                    <p className="text-xs text-muted-foreground">Interface language</p>
                  </div>
                  <Select
                    options={[
                      { value: "en", label: "English" },
                      { value: "es", label: "Spanish" },
                      { value: "fr", label: "French" },
                      { value: "de", label: "German" },
                    ]}
                    value="en"
                    onChange={() => {}}
                    className="w-36"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Date Format</p>
                    <p className="text-xs text-muted-foreground">How dates are displayed</p>
                  </div>
                  <Select
                    options={[
                      { value: "US", label: "MM/DD/YYYY" },
                      { value: "EU", label: "DD/MM/YYYY" },
                      { value: "ISO", label: "YYYY-MM-DD" },
                    ]}
                    value="US"
                    onChange={() => {}}
                    className="w-36"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...</>
                ) : saved ? (
                  <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Saved!</>
                ) : (
                  <><Save className="mr-1.5 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </div>
          </div>
        );

      case "ai":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Provider Configuration</CardTitle>
              <CardDescription>Configure the AI providers used for analysis and insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Default AI Provider</p>
                      <p className="text-xs text-muted-foreground">Primary provider for analysis generation</p>
                    </div>
                  </div>
                  <Select
                    options={[
                      { value: "anthropic", label: "Anthropic Claude" },
                      { value: "openai", label: "OpenAI GPT" },
                      { value: "gemini", label: "Google Gemini" },
                    ]}
                    value="anthropic"
                    onChange={() => {}}
                    className="w-44"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Default Model</p>
                      <p className="text-xs text-muted-foreground">Model used for generating insights</p>
                    </div>
                  </div>
                  <Select
                    options={[
                      { value: "claude-opus-5", label: "Claude Opus 5" },
                      { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
                      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
                    ]}
                    value="claude-opus-5"
                    onChange={() => {}}
                    className="w-44"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">API Keys</h3>
                {[
                  { provider: "Anthropic", key: "sk-ant-****1234", connected: true },
                  { provider: "OpenAI", key: "Not configured", connected: false },
                  { provider: "Google Gemini", key: "Not configured", connected: false },
                ].map((item) => (
                  <div key={item.provider} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.connected ? "bg-emerald-500/10" : "bg-muted"}`}>
                        <Key className={`h-4 w-4 ${item.connected ? "text-emerald-500" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.provider}</p>
                        <p className="text-xs text-muted-foreground">{item.key}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      {item.connected ? "Update" : "Configure"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Analysis Complete", desc: "Get notified when analysis finishes" },
                { label: "Data Quality Alerts", desc: "Alerts when data quality issues are detected" },
                { label: "Export Ready", desc: "Notification when exports are complete" },
                { label: "Weekly Summary", desc: "Weekly digest of your analysis activity" },
                { label: "Error Reports", desc: "Get notified when analyses fail" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator className="my-3" />
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case "data":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Management</CardTitle>
                <CardDescription>Configure dataset storage and processing preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Max Upload Size</p>
                    <p className="text-xs text-muted-foreground">Maximum file size for dataset uploads</p>
                  </div>
                  <Select
                    options={[
                      { value: "50", label: "50 MB" },
                      { value: "100", label: "100 MB" },
                      { value: "500", label: "500 MB" },
                      { value: "1000", label: "1 GB" },
                    ]}
                    value="100"
                    onChange={() => {}}
                    className="w-28"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-delete Datasets</p>
                    <p className="text-xs text-muted-foreground">Automatically delete datasets older than</p>
                  </div>
                  <Select
                    options={[
                      { value: "7", label: "7 days" },
                      { value: "30", label: "30 days" },
                      { value: "90", label: "90 days" },
                      { value: "0", label: "Never" },
                    ]}
                    value="0"
                    onChange={() => {}}
                    className="w-28"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable Caching</p>
                    <p className="text-xs text-muted-foreground">Cache analysis results for faster loading</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Settings</CardTitle>
                <CardDescription>Manage your account security and session preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Session Timeout</p>
                    <p className="text-xs text-muted-foreground">Automatically log out after inactivity</p>
                  </div>
                  <Select
                    options={[
                      { value: "15", label: "15 min" },
                      { value: "30", label: "30 min" },
                      { value: "60", label: "1 hour" },
                      { value: "240", label: "4 hours" },
                      { value: "0", label: "Never" },
                    ]}
                    value="60"
                    onChange={() => {}}
                    className="w-28"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Data Encryption</p>
                    <p className="text-xs text-muted-foreground">All data is encrypted at rest and in transit</p>
                  </div>
                  <Badge variant="success" className="text-[10px]">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your workspace preferences, AI providers, and account settings
          </p>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="pills" size="md" className="mb-8" />

        {/* Tab Content */}
        {tabContent()}
      </div>
    </AppShell>
  );
}
