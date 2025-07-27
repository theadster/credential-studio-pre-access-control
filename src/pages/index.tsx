import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Users, 
  Shield, 
  Settings, 
  Camera, 
  Printer,
  CheckCircle,
  ArrowRight,
  Zap,
  Lock,
  Cloud
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 }
};

export default function Home() {
  return (
    <>
      <Head>
        <title>credential.studio - Professional Event Credential Management</title>
        <meta name="description" content="Create, manage, and print professional event credentials with ease. Full CRUD capabilities, role-based access control, and seamless integrations." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="bg-gradient-to-br from-background via-surface to-surface-variant min-h-screen">
        {/* Navigation */}
        <motion.nav 
          className="border-b glass-effect sticky top-0 z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">credential.studio</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4">
                Professional Event Management
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-5xl md:text-7xl font-bold mb-6 gradient-text"
              variants={fadeInUp}
            >
              Event Credentials
              <br />
              Made Simple
            </motion.h1>
            
            <motion.p 
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              Create, manage, and print professional event credentials with our comprehensive platform. 
              Full CRUD capabilities, role-based access control, and seamless integrations with Cloudinary and Switchboard Canvas.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={fadeInUp}
            >
              <Link href="/signup">
                <Button size="lg" className="group">
                  Start Your Event
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In to Dashboard
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Hero Image */}
        <motion.section 
          className="container mx-auto px-4 mb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-3xl"></div>
            <img 
              src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
              alt="Event management dashboard"
              className="relative rounded-2xl border w-full h-[400px] object-cover"
            />
          </div>
        </motion.section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-20">
          <motion.div 
            className="text-center mb-16"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for managing event credentials from start to finish
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Users,
                title: "Attendee Management",
                description: "Complete CRUD operations for attendee records with custom fields and photo uploads"
              },
              {
                icon: Shield,
                title: "Role-Based Access",
                description: "Secure user authentication with granular permissions and role management"
              },
              {
                icon: Settings,
                title: "Event Configuration",
                description: "Comprehensive event settings including barcode generation and custom fields"
              },
              {
                icon: Camera,
                title: "Photo Integration",
                description: "Seamless photo uploads with Cloudinary widget integration"
              },
              {
                icon: Printer,
                title: "Professional Printing",
                description: "High-quality credential printing with Switchboard Canvas API"
              },
              {
                icon: Lock,
                title: "Complete Logging",
                description: "Full audit trail of all user actions and system changes"
              }
            ].map((feature, index) => (
              <motion.div key={index} variants={scaleIn}>
                <Card className="h-full hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border-0 glass-effect group">
                  <CardHeader>
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Benefits Section */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <motion.div 
              className="grid lg:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div>
                <h2 className="text-4xl font-bold mb-6">Why Choose credential.studio?</h2>
                <div className="space-y-4">
                  {[
                    "Single event focus for maximum efficiency",
                    "Professional credential design and printing",
                    "Secure cloud-based data management",
                    "Real-time collaboration and updates",
                    "Comprehensive audit logging",
                    "Easy integration with existing workflows"
                  ].map((benefit, index) => (
                    <motion.div 
                      key={index}
                      className="flex items-center space-x-3"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-lg">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl blur-2xl"></div>
                <img 
                  src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                  alt="Professional event credentials"
                  className="relative rounded-2xl border w-full h-[400px] object-cover"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-5"></div>
          <div className="container mx-auto px-4 relative">
            <motion.div 
              className="text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of event organizers who trust credential.studio for their credential management needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="group shadow-lg hover:shadow-xl transition-shadow">
                    <Zap className="mr-2 h-4 w-4" />
                    Create Your Event
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="glass-effect">
                    <Cloud className="mr-2 h-4 w-4" />
                    Access Dashboard
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <CreditCard className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">credential.studio</span>
              </div>
              <p className="text-muted-foreground">
                © 2024 credential.studio. Professional event credential management.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}