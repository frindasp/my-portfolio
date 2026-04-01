"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { submitContact } from "@/app/actions/contact";
import { contactSchema, ContactFormData } from "@/lib/schema";
import { useContactStore } from "@/store/contactStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const { name, email, message, reset } = useContactStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, reset: resetForm, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name, email, message },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true); setSubmitError(null); setSubmitSuccess(false);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    const result = (await submitContact(formData)) as any;
    if (result.redirect) {
      toast.info("Welcome back! Please login to continue.");
      router.push(`${result.redirect}?email=${encodeURIComponent(result.email || "")}`);
      return;
    }
    if (result.success) { setSubmitSuccess(true); toast.success("Message sent successfully!"); }
    else { const msg = result.error || "An error occurred while submitting the form."; setSubmitError(msg); toast.error(msg); }
    setIsSubmitting(false);
  };

  const handleManualReset = () => {
    reset(); resetForm(); setSubmitSuccess(false); setSubmitError(null); toast.info("Form has been reset.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField id="name" label="Name" error={errors.name?.message}><Input id="name" {...register("name")} placeholder="Your name" /></FormField>
      <FormField id="email" label="Email" error={errors.email?.message}><Input id="email" type="email" {...register("email")} placeholder="Your email" /></FormField>
      <FormField id="message" label="Message" error={errors.message?.message}><Textarea id="message" {...register("message")} placeholder="Your message" /></FormField>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting ? "Sending..." : "Send Message"}</Button>
        <Button type="button" variant="outline" onClick={handleManualReset} disabled={isSubmitting} className="w-full sm:w-auto">Reset Form</Button>
      </div>
      {submitSuccess && <p className="text-sm text-green-600">Message sent successfully.</p>}
      {submitError && <p className="text-sm text-red-500">{submitError}</p>}
    </form>
  );
}

function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block mb-2">{label}</label>
      {children}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
