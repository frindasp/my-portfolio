import { Metadata } from "next";

export const metadata: Metadata = {
  title: "about",
};

export default function About() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">About Taufania Frinda</h1>
      <p className="mb-4">
        Hello! I'm Taufania Frinda, a passionate [your profession/interests]
        based in [your location]. With a background in [your field], I strive to
        [your goals or mission].
      </p>
      <p className="mb-4">
        My journey in [your field] began [brief background]. Since then, I've
        been dedicated to [your achievements or ongoing projects].
      </p>
      <p>
        When I'm not [your professional activities], you can find me [your
        hobbies or interests]. I believe in [your personal philosophy or
        values], and I'm always excited to [future goals or aspirations].
      </p>
    </div>
  );
}
