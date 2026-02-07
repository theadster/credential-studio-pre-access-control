import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  IdCard,
  Users, 
  Shield, 
  Camera, 
  Printer,
  ArrowRight,
  Sparkles,
  Zap,
  Lock
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function Home() {
  return (
    <>
      <Head>
        <title>credential.studio - Event Credential Management</title>
        <meta name="description" content="Professional event credential management made simple. Create, manage, and print credentials for concerts, conferences, and events." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      <div className="min-h-screen bg-background" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Minimal Navigation */}
        <motion.nav 
          className="border-b bg-background/80 backdrop-blur-xs sticky top-0 z-50"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="container mx-auto px-6 py-5 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <IdCard className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-primary">credential.studio</span>
            </div>
            <Link href="/login">
              <Button 
                variant="default"
                className="font-medium"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </motion.nav>

        {/* Hero Section - Asymmetric Layout */}
        <section className="relative overflow-hidden">
          <div className="container mx-auto px-6 py-12 lg:py-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left - Text Content */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-8"
              >
                <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Professional Credential Management
                </motion.div>
                
                <motion.h1 
                  variants={fadeIn}
                  className="text-5xl lg:text-7xl font-black leading-tight tracking-tight"
                >
                  Event Credentials
                  <br />
                  <span className="text-primary">Made Simple</span>
                </motion.h1>
                
                <motion.p 
                  variants={fadeIn}
                  className="text-xl text-muted-foreground leading-relaxed max-w-xl"
                >
                  Create, manage, and print professional credentials for live events, televised productions, concerts, and conferences. Everything you need in one platform.
                </motion.p>
                
                <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
                  <Link href="/login">
                    <Button size="lg" className="group text-base font-semibold px-8 h-12">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Right - Hero Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl"></div>
                <div className="relative rounded-3xl overflow-hidden border-2 border-primary/20 shadow-2xl">
                  <Image 
                    src="https://images.pexels.com/photos/29255743/pexels-photo-29255743.jpeg"
                    alt="VIP event badges - Photo by Jonathan Borba on Pexels"
                    width={1200}
                    height={600}
                    priority
                    className="w-full h-[500px] lg:h-[600px] object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Bento Box Features Grid */}
        <section className="container mx-auto px-6 py-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for professional credential management
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Large Feature Card - Attendee Management */}
            <motion.div 
              variants={fadeIn}
              className="md:col-span-2 lg:row-span-2 group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Complete Attendee Management</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    Create, edit, and organize attendee records with custom fields, photo uploads, and real-time updates. Manage thousands of credentials effortlessly.
                  </p>
                </div>
                <div className="mt-8">
                  <Image 
                    src="https://images.pexels.com/photos/1763067/pexels-photo-1763067.jpeg"
                    alt="Live music concert - Photo by Sebastian Ervi on Pexels"
                    width={800}
                    height={192}
                    className="rounded-xl w-full h-48 object-cover border border-border"
                  />
                </div>
              </div>
            </motion.div>

            {/* Security Card */}
            <motion.div 
              variants={fadeIn}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Secure Access Control</h3>
                <p className="text-muted-foreground">
                  Control who can view and edit credentials with customizable user roles and permissions.
                </p>
              </div>
            </motion.div>

            {/* Photo Integration Card */}
            <motion.div 
              variants={fadeIn}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                  <Camera className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Photo Management</h3>
                <p className="text-muted-foreground">
                  Upload, resize, and crop photos directly in your browser for perfect credential images.
                </p>
              </div>
            </motion.div>

            {/* Printing Card */}
            <motion.div 
              variants={fadeIn}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                  <Printer className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Professional Credentials</h3>
                <p className="text-muted-foreground">
                  Generate beautiful, print-ready credential images and PDFs with custom designs for every attendee.
                </p>
              </div>
            </motion.div>

            {/* Audit Trail Card */}
            <motion.div 
              variants={fadeIn}
              className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                    <Lock className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Activity Tracking</h3>
                  <p className="text-muted-foreground">
                    Track every change and action in your event with detailed activity logs for complete peace of mind.
                  </p>
                </div>
                <div className="hidden lg:block">
                  <Image 
                    src="https://images.pexels.com/photos/8761297/pexels-photo-8761297.jpeg"
                    alt="Event credentials with lanyards - Photo by Pavel Danilyuk on Pexels"
                    width={192}
                    height={128}
                    className="rounded-xl w-48 h-32 object-cover border border-border"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Visual Impact Section */}
        <section className="relative py-16 lg:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"></div>
          <div className="container mx-auto px-6 relative">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-2xl"></div>
                <Image 
                  src="https://images.pexels.com/photos/1309598/pexels-photo-1309598.jpeg"
                  alt="Concert atmosphere - Photo by Lukas on Pexels"
                  width={1200}
                  height={500}
                  className="relative rounded-2xl w-full h-[400px] lg:h-[500px] object-cover border-2 border-primary/20 shadow-2xl"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Zap className="h-4 w-4" />
                  Built for Events
                </div>
                <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
                  From Concerts to Conferences
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Whether you're managing credentials for a music festival, corporate conference, or televised event, credential.studio provides the tools you need for professional, secure credential management.
                </p>
                <div className="space-y-4 pt-4">
                  {[
                    "Single event focus for maximum efficiency",
                    "Real-time collaboration and updates",
                    "Secure cloud-based data management"
                  ].map((benefit, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-lg text-foreground">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-12 lg:py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 p-12 lg:p-20 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
            <div className="relative z-10 max-w-3xl mx-auto">
              <div className="space-y-3 mb-8">
                <h2 className="text-4xl lg:text-5xl font-black tracking-tight">
                  Ready to Get Started?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Join event organizers who trust credential.studio for professional credential management.
                </p>
              </div>
              <Link href="/login">
                <Button size="lg" className="group text-base font-semibold px-8 h-12 shadow-lg hover:shadow-xl transition-shadow">
                  Access Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Minimal Footer */}
        <footer className="border-t bg-background/50 backdrop-blur-xs">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2">
                <IdCard className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">credential.studio</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2025 credential.studio. Professional event credential management.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}