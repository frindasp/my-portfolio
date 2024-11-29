import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <h1 className="text-4xl font-bold mb-4 text-center">
        {`Welcome to Taufania Frinda's Website`}
      </h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        Explore my world of creativity, innovation, and passion. Discover my
        projects, learn about my journey, and get in touch!
      </p>
      <div className="space-x-4">
        <Button asChild>
          <Link href="/about">Learn More About Me</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact">Get in Touch</Link>
        </Button>
      </div>
    </div>
  );
}
