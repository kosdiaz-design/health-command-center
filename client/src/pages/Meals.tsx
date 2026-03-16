import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Meal, Workout } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, UtensilsCrossed, Dumbbell, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

const mealTimes = ["breakfast", "lunch", "dinner", "snack"];
const mealTimeColors: Record<string, string> = {
  breakfast: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  lunch: "bg-green-500/10 text-green-600 dark:text-green-400",
  dinner: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  snack: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const trainingDayTemplate = [
  { mealTime: "breakfast", name: "Greek Yogurt + Oats + Berries", calories: 480, protein: 35, carbs: 62, fat: 8 },
  { mealTime: "snack", name: "Jocko Molk RTD (pre-workout)", calories: 280, protein: 42, carbs: 8, fat: 7 },
  { mealTime: "lunch", name: "Chicken Rice Bowl + Vegetables", calories: 650, protein: 55, carbs: 75, fat: 12 },
  { mealTime: "snack", name: "Quest 45g RTD + Banana", calories: 340, protein: 45, carbs: 30, fat: 3 },
  { mealTime: "dinner", name: "Salmon + Sweet Potato + Asparagus", calories: 720, protein: 52, carbs: 58, fat: 18 },
];

const restDayTemplate = [
  { mealTime: "breakfast", name: "Eggs + Avocado + Whole Grain Toast", calories: 520, protein: 28, carbs: 38, fat: 24 },
  { mealTime: "lunch", name: "Mission BBQ — Turkey + Vegetables", calories: 580, protein: 48, carbs: 35, fat: 16 },
  { mealTime: "snack", name: "Barbell Snack Bar + String Cheese", calories: 290, protein: 28, carbs: 22, fat: 10 },
  { mealTime: "dinner", name: "Ground Turkey Bowl + Roasted Veg", calories: 650, protein: 50, carbs: 45, fat: 18 },
];

const workDayTemplate = [
  { mealTime: "breakfast", name: "Protein Shake + Oatmeal (before shift)", calories: 490, protein: 42, carbs: 55, fat: 8 },
  { mealTime: "lunch", name: "Fresh Kitchen — Custom Bowl (work)", calories: 620, protein: 48, carbs: 52, fat: 16 },
  { mealTime: "dinner", name: "Bolay — Protein Bowl (late meal)", calories: 680, protein: 52, carbs: 60, fat: 14 },
  { mealTime: "snack", name: "Quest RTD + Chick-fil-A Grilled Nuggets", calories: 380, protein: 52, carbs: 16, fat: 8 },
];

export default function Meals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdd, setShowAdd] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const { data: meals = [] } = useQuery<Meal[]>({
    queryKey: ["/api/meals", selectedDate],
    queryFn: () => apiRequest("GET", `/api/meals?date=${selectedDate}`),
  });
  const { data: workouts = [] } = useQuery<Workout[]>({
    queryKey: ["/api/workouts"],
    queryFn: () => apiRequest("GET", "/api/workouts"),
  });

  const todayWorkout = workouts.find(w => w.date === selectedDate);
  const isTrainingDay = todayWorkout && todayWorkout.type !== 'rest';

  const addMeal = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/meals", { ...data, date: selectedDate, trainingDay: !!isTrainingDay }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/meals"] }); setShowAdd(false); reset(); toast({ title: "Meal added" }); },
  });

  const deleteMeal = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/meals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meals"] }),
  });

  const loadTemplate = (template: typeof trainingDayTemplate) => {
    template.forEach(t => addMeal.mutate({ ...t, notes: null }));
  };

  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCalories = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const proteinTarget = 185; // ~1g per lb body weight
  const calTarget = isTrainingDay ? 2800 : 2400;

  const mealsByTime = mealTimes.reduce((acc, t) => {
    acc[t] = meals.filter(m => m.mealTime === t);
    return acc;
  }, {} as Record<string, Meal[]>);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Meal Planner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Nutrition tracking & training-adjusted targets</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground" />
          <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-meal" className="gap-1.5">
            <Plus size={14} /> Add Meal
          </Button>
        </div>
      </div>

      {/* Day type banner */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${isTrainingDay ? "bg-primary/8 border border-primary/20" : "bg-muted/50 border border-border"}`}>
        {isTrainingDay ? <Dumbbell size={14} className="text-primary" /> : <UtensilsCrossed size={14} className="text-muted-foreground" />}
        <div>
          <p className="text-sm font-medium">{isTrainingDay ? "Training Day" : "Rest / Recovery Day"}</p>
          <p className="text-xs text-muted-foreground">
            {isTrainingDay ? `Calorie target: ${calTarget} kcal · Protein target: ${proteinTarget}g · Higher carbs` : `Calorie target: ${calTarget} kcal · Protein target: ${proteinTarget}g · Lower carbs, higher fat`}
          </p>
        </div>
        {todayWorkout && <Badge className="ml-auto text-xs border-0 bg-primary/15 text-primary">{todayWorkout.label}</Badge>}
      </div>

      {/* Macros summary */}
      {meals.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Calories", val: totalCalories, target: calTarget, unit: "kcal", color: "bg-yellow-500" },
            { label: "Protein", val: totalProtein, target: proteinTarget, unit: "g", color: "bg-primary" },
            { label: "Carbs", val: totalCarbs, target: isTrainingDay ? 280 : 180, unit: "g", color: "bg-green-500" },
            { label: "Fat", val: totalFat, target: isTrainingDay ? 70 : 90, unit: "g", color: "bg-orange-500" },
          ].map(({ label, val, target, unit, color }) => (
            <Card key={label} className="bg-card border-card-border">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold tabular-nums mt-0.5">{val}<span className="text-xs text-muted-foreground font-normal">/{target}{unit}</span></p>
                <div className="h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${color} ${val > target ? "opacity-70" : ""}`} style={{ width: `${Math.min((val / target) * 100, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template buttons */}
      {meals.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Load a meal template</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => loadTemplate(trainingDayTemplate)}>
              <Dumbbell size={12} /> Training Day Template
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => loadTemplate(restDayTemplate)}>
              <UtensilsCrossed size={12} /> Rest Day Template
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => loadTemplate(workDayTemplate)}>
              <Zap size={12} /> Work Shift Template
            </Button>
          </div>
        </div>
      )}

      {/* Meals by time */}
      <div className="space-y-3">
        {mealTimes.map(time => {
          const timeMeals = mealsByTime[time];
          if (timeMeals.length === 0) return null;
          return (
            <Card key={time} className="bg-card border-card-border">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{time}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-2">
                {timeMeals.map(meal => (
                  <div key={meal.id} data-testid={`row-meal-${meal.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{meal.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {meal.calories} kcal · {meal.protein}g protein · {meal.carbs}g carbs · {meal.fat}g fat
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMeal.mutate(meal.id)}
                      data-testid={`button-delete-meal-${meal.id}`}
                      className="text-muted-foreground/40 hover:text-red-400 ml-3 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
        {meals.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No meals logged yet. Add a meal or load a template above.
          </div>
        )}
      </div>

      {/* Add meal dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Meal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => addMeal.mutate(d))} className="space-y-3">
            <div>
              <Label className="text-xs">Meal Name</Label>
              <Input {...register("name", { required: true })} placeholder="e.g. Grilled Chicken Bowl" className="mt-1" data-testid="input-meal-name" />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Select onValueChange={v => setValue("mealTime", v)} defaultValue="lunch">
                <SelectTrigger className="mt-1" data-testid="select-meal-time"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mealTimes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Calories</Label><Input {...register("calories", { valueAsNumber: true })} type="number" placeholder="450" className="mt-1" /></div>
              <div><Label className="text-xs">Protein (g)</Label><Input {...register("protein", { valueAsNumber: true })} type="number" placeholder="40" className="mt-1" /></div>
              <div><Label className="text-xs">Carbs (g)</Label><Input {...register("carbs", { valueAsNumber: true })} type="number" placeholder="50" className="mt-1" /></div>
              <div><Label className="text-xs">Fat (g)</Label><Input {...register("fat", { valueAsNumber: true })} type="number" placeholder="12" className="mt-1" /></div>
            </div>
            <Button type="submit" className="w-full" disabled={addMeal.isPending} data-testid="button-submit-meal">Add Meal</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
