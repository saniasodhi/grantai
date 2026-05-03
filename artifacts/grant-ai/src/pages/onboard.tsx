import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

const ORG_TYPES = [
  "Nonprofit 501(c)(3)",
  "Social Enterprise",
  "Educational Institution",
  "Government Agency",
  "For-profit with social mission",
];

const FOCUS_AREAS = [
  "Education",
  "Climate & Environment",
  "Women in Tech",
  "Healthcare",
  "Social Impact",
  "AI Research",
  "Small Business",
  "Arts & Culture",
  "Disability Rights",
  "Food Security",
];

const schema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
  orgType: z.string().min(1, "Please select an organization type"),
  mission: z.string().min(10, "Mission statement must be at least 10 characters"),
  location: z.string().min(2, "Location is required"),
  fundingNeed: z.number().min(5000),
  focusAreas: z.array(z.string()).min(1, "Select at least one focus area"),
});

type FormValues = z.infer<typeof schema>;

export default function Onboard() {
  const [step, setStep] = useState(1);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createUser = useCreateUser();
  const totalSteps = 5;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      orgName: "",
      orgType: "",
      mission: "",
      location: "",
      fundingNeed: 50000,
      focusAreas: [],
    },
  });

  const nextStep = async () => {
    const fieldsToValidate = {
      1: ["orgName", "orgType"] as const,
      2: ["mission"] as const,
      3: ["location"] as const,
      4: ["fundingNeed"] as const,
      5: ["focusAreas"] as const,
    }[step];

    if (fieldsToValidate) {
      const isValid = await form.trigger(fieldsToValidate);
      if (isValid) {
        if (step < totalSteps) {
          setStep((s) => s + 1);
        } else {
          onSubmit(form.getValues());
        }
      }
    }
  };

  const prevStep = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const onSubmit = (data: FormValues) => {
    createUser.mutate(
      {
        data: {
          orgName: data.orgName,
          orgType: data.orgType,
          mission: data.mission,
          location: data.location,
          fundingNeed: data.fundingNeed,
          focusAreas: data.focusAreas.join(", "),
        },
      },
      {
        onSuccess: async (user) => {
          localStorage.setItem("grantai_user_id", String(user.id));
          setIsGeneratingMatches(true);
          try {
            await fetch("/api/matches/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id }),
            });
          } catch {
            // Non-fatal: matches can be regenerated from dashboard
          } finally {
            setIsGeneratingMatches(false);
          }
          toast({
            title: "Welcome to GrantAI",
            description: "Your AI has matched you with top grants.",
          });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Something went wrong. Please try again.",
          });
        },
      },
    );
  };

  const isLoading = createUser.isPending || isGeneratingMatches;

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  if (isGeneratingMatches) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="absolute left-8 top-8 flex items-center gap-2 font-bold tracking-tight text-foreground">
          <div className="h-6 w-6 rounded bg-primary"></div>
          <span className="text-xl">GrantAI</span>
        </div>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-10 w-10 animate-pulse text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Finding your best grants…</h2>
            <p className="mt-2 text-muted-foreground">
              Our AI is scanning 50 grants and ranking the best matches for your mission.
            </p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="absolute left-8 top-8 flex items-center gap-2 font-bold tracking-tight text-foreground">
        <div className="h-6 w-6 rounded bg-primary"></div>
        <span className="text-xl">GrantAI</span>
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% completed</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="relative min-h-[400px] rounded-2xl border border-white/10 bg-card p-8 shadow-xl">
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
              <AnimatePresence mode="wait" custom={1}>
                <motion.div
                  key={step}
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                  className="space-y-6"
                >
                  {step === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Let's build your profile</h2>
                        <p className="text-muted-foreground">Tell us about your organization to get started.</p>
                      </div>
                      <FormField control={form.control} name="orgName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Foundation" {...field} className="bg-input/50" data-testid="input-org-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="orgType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-input/50" data-testid="select-org-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ORG_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">What's your mission?</h2>
                        <p className="text-muted-foreground">This helps our AI find grants that align perfectly with your goals.</p>
                      </div>
                      <FormField control={form.control} name="mission" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your organization's mission in 2-3 sentences..."
                              className="min-h-[150px] resize-none bg-input/50"
                              {...field}
                              data-testid="textarea-mission"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Where do you operate?</h2>
                        <p className="text-muted-foreground">Many grants are location-specific.</p>
                      </div>
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. San Francisco, CA or National" {...field} className="bg-input/50" data-testid="input-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Funding Need</h2>
                        <p className="text-muted-foreground">What size grants are you looking for?</p>
                      </div>
                      <FormField control={form.control} name="fundingNeed" render={({ field }) => (
                        <FormItem className="space-y-8">
                          <div className="flex items-center justify-between">
                            <FormLabel>Amount</FormLabel>
                            <span className="text-xl font-bold text-primary">${field.value.toLocaleString()}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={5000}
                              max={500000}
                              step={5000}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="py-4"
                              data-testid="slider-funding"
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>$5,000</span>
                            <span>$500,000+</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Focus Areas</h2>
                        <p className="text-muted-foreground">Select all areas that apply to your work.</p>
                      </div>
                      <FormField control={form.control} name="focusAreas" render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {FOCUS_AREAS.map((item) => (
                              <FormField key={item} control={form.control} name="focusAreas" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/10 bg-input/20 p-4 transition-colors hover:bg-input/40">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item])
                                          : field.onChange(field.value?.filter((v) => v !== item));
                                      }}
                                      data-testid={`checkbox-focus-${item.replace(/\s+/g, "-").toLowerCase()}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="cursor-pointer font-normal">{item}</FormLabel>
                                </FormItem>
                              )} />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 flex justify-between border-t border-white/10 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  disabled={step === 1 || isLoading}
                  data-testid="button-prev"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-next"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finding matches…</>
                  ) : step === totalSteps ? (
                    <><Check className="mr-2 h-4 w-4" /> Complete Setup</>
                  ) : (
                    <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
