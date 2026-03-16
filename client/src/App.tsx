import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Workouts from "@/pages/Workouts";
import Recovery from "@/pages/Recovery";
import Meals from "@/pages/Meals";
import Medications from "@/pages/Medications";
import HealthRecords from "@/pages/HealthRecords";
import VoiceNotes from "@/pages/VoiceNotes";
import Integrations from "@/pages/Integrations";
import NotFound from "@/pages/not-found";

export default function App() {
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/workouts" component={Workouts} />
            <Route path="/recovery" component={Recovery} />
            <Route path="/meals" component={Meals} />
            <Route path="/medications" component={Medications} />
            <Route path="/health-records" component={HealthRecords} />
            <Route path="/voice-notes" component={VoiceNotes} />
            <Route path="/integrations" component={Integrations} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
