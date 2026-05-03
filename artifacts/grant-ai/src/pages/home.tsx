import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap, Target, Shield, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleCanvas } from "@/components/particle-canvas";
import { VisionModal } from "@/components/vision-modal";

export default function Home() {
  const [, setLocation] = useLocation();
  const [visionOpen, setVisionOpen] = useState(false);
  const userId = localStorage.getItem("grantai_user_id");

  useEffect(() => {
    if (userId) {
      setLocation("/dashboard");
    }
  }, [userId, setLocation]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Navbar */}
      <nav className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-background/80 px-6 backdrop-blur-md md:px-12">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="text-xl">GrantAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/onboard">
            <Button variant="ghost" className="hidden text-muted-foreground hover:text-foreground md:flex" data-testid="link-login">
              Log in
            </Button>
          </Link>
          <Link href="/onboard">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-get-started-nav">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 pt-16 text-center"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Animated particle network canvas */}
        <ParticleCanvas />

        {/* Slow shifting gradient mesh */}
        <motion.div
          className="absolute inset-0 -z-0"
          animate={{
            background: [
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.18) 0%, rgba(16,185,129,0.08) 50%, transparent 100%)",
              "radial-gradient(ellipse 80% 60% at 60% 10%, rgba(16,185,129,0.16) 0%, rgba(99,102,241,0.08) 50%, transparent 100%)",
              "radial-gradient(ellipse 80% 60% at 40% 5%, rgba(99,102,241,0.16) 0%, rgba(59,130,246,0.08) 50%, transparent 100%)",
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.18) 0%, rgba(16,185,129,0.08) 50%, transparent 100%)",
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />

        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="relative z-10 mb-6 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
        >
          <Zap className="mr-2 h-4 w-4" />
          GrantAI 2.0 is live
        </motion.div>

        {/* Hero heading with animated gradient glow */}
        <motion.h1
          variants={itemVariants}
          className="relative z-10 max-w-4xl text-balance text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl"
        >
          Your AI{" "}
          <motion.span
            className="relative inline-block"
            animate={{
              textShadow: [
                "0 0 40px rgba(59,130,246,0.6), 0 0 80px rgba(59,130,246,0.3)",
                "0 0 40px rgba(16,185,129,0.6), 0 0 80px rgba(16,185,129,0.3)",
                "0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(99,102,241,0.3)",
                "0 0 40px rgba(59,130,246,0.6), 0 0 80px rgba(59,130,246,0.3)",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{
              background: "linear-gradient(135deg, #3b82f6, #10b981, #6366f1, #3b82f6)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            <motion.span
              style={{ display: "inline-block" }}
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
              Grant Officer
            </motion.span>
          </motion.span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="relative z-10 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
        >
          Stop searching. Start winning. We match your nonprofit with the perfect grants and draft winning applications in minutes, not weeks.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="relative z-10 mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
        >
          <Link href="/onboard">
            <Button
              size="lg"
              className="group relative h-14 overflow-hidden bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90"
              data-testid="button-start-free"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
              />
              <span className="relative flex items-center">
                Start for free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </Link>
          <Button
            size="lg"
            onClick={() => setVisionOpen(true)}
            className="h-14 gap-2 border border-emerald-500/30 bg-emerald-500/10 px-8 text-base text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
            data-testid="button-vision-onboard"
          >
            <Camera className="h-5 w-5" />
            📸 Try Vision Onboarding
          </Button>
          <Link href="/showcase">
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-white/15 bg-white/5 px-8 text-base hover:bg-white/10"
            >
              🎯 See Autopilot live
            </Button>
          </Link>
        </motion.div>

        {/* Floating ambient orbs */}
        <motion.div
          className="pointer-events-none absolute left-1/4 top-1/3 h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-1/4 top-1/2 h-48 w-48 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #10b981, transparent)" }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.section>

      {/* Social Proof */}
      <section className="border-y border-white/5 bg-white/5 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-3xl font-bold text-foreground">2,400+</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">Trusted Nonprofits</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <p className="text-3xl font-bold text-foreground">50,000+</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">Grants Indexed</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="text-3xl font-bold text-primary">$48M+</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">Awarded to Users</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.h2
            className="text-3xl font-bold md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            The unfair advantage
          </motion.h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            We've automated the most painful parts of the grant lifecycle.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { icon: Target, color: "primary", title: "Precision Matching", desc: "Our AI reads thousands of grant guidelines and matches them against your exact mission, location, and needs." },
              { icon: Zap, color: "accent", title: "Draft Generation", desc: "Generate high-quality first drafts tailored to each specific funder's priorities and language requirements." },
              { icon: Shield, color: "primary", title: "Always Updated", desc: "We track deadlines and requirement changes in real-time so you never miss an opportunity again." },
            ].map(({ icon: Icon, color, title, desc }, i) => (
              <motion.div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-sm"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-${color}/20 text-${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-3 text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white/5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.h2
            className="text-3xl font-bold md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            They stopped searching
          </motion.h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Sarah J.", org: "Ocean Cleanup Initiative", quote: "GrantAI found a $50k grant we didn't know existed, and the AI drafted 80% of the application. We won it." },
              { name: "David M.", org: "Tech for Youth", quote: "I used to spend 15 hours a week hunting for grants. Now I spend 15 minutes reviewing what GrantAI found for me." },
              { name: "Elena R.", org: "City Food Bank", quote: "The ROI is absurd. For the price of a fancy dinner, we have a full-time AI grant writer on staff." },
            ].map((t, i) => (
              <motion.div
                key={i}
                className="rounded-2xl border border-white/10 bg-background/50 p-8 text-left backdrop-blur-sm"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              >
                <div className="mb-4 flex">
                  {[...Array(5)].map((_, j) => (
                    <CheckCircle2 key={j} className="h-5 w-5 text-accent" />
                  ))}
                </div>
                <p className="text-lg italic text-foreground">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.org}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <motion.div
          className="mx-auto max-w-4xl rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-background px-6 py-16 text-center shadow-2xl shadow-primary/10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl font-bold md:text-5xl">Ready to win more grants?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Join thousands of nonprofits using AI to accelerate their funding. Get your first matches in 60 seconds.
          </p>
          <Link href="/onboard">
            <Button size="lg" className="mt-8 h-14 bg-primary px-8 text-base hover:bg-primary/90" data-testid="button-final-cta">
              Start your free trial
            </Button>
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 py-12 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2 font-bold tracking-tight text-foreground">
            <div className="h-5 w-5 rounded bg-primary" />
            <span>GrantAI</span>
          </div>
          <p>© 2025 GrantAI Inc. All rights reserved.</p>
        </div>
      </footer>

      <VisionModal open={visionOpen} onClose={() => setVisionOpen(false)} />
    </div>
  );
}
