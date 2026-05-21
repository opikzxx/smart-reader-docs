import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { redirect } from "next/navigation";

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const error = searchParams?.error;

  return <LoginForm error={error} />;
}
