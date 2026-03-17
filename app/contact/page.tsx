"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContactStore } from "@/store/contactStore";
// import { submitContact } from "../actions/contact";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, ContactFormData } from "@/lib/schema";
import { submitContact } from "../actions/contact";
import { toast } from "sonner";

export default function Contact() {
  const { name, email, message, setName, setEmail, setMessage, reset } =
    useContactStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name, email, message },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));

    const result = await submitContact(formData);

    console.log("result", result);
    if (result.success) {
      setSubmitSuccess(true);
      toast.success("Message sent successfully!");
      // Kita tidak reset() atau reload() agar data tetap ada sesuai permintaan user
    } else {
      const errorMsg = result.error || "An error occurred while submitting the form.";
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    }

    setIsSubmitting(false);
  };

  const handleManualReset = () => {
    reset(); // Reset zustand store
    resetForm(); // Reset react-hook-form
    setSubmitSuccess(false);
    setSubmitError(null);
    toast.info("Form has been reset.");
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contact Me</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block mb-2">
            Name
          </label>
          <Input id="name" {...register("name")} placeholder="Your name" />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="block mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="Your email"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="message" className="block mb-2">
            Message
          </label>
          <Textarea
            id="message"
            {...register("message")}
            placeholder="Your message"
          />
          {errors.message && (
            <p className="text-red-500 text-sm mt-1">
              {errors.message.message}
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleManualReset}
            disabled={isSubmitting}
          >
            Reset Form
          </Button>
        </div>
      </form>
    </div>
  );
}
