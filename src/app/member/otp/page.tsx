import { redirect } from "next/navigation";

export default function OtpCompatibilityPage(): never {
  redirect("/member/login?notice=Login%20member%20sekarang%20memakai%20email%20dan%20password.");
}
