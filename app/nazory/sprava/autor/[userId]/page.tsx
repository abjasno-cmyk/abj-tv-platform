import { redirect } from "next/navigation";

export default async function LegacyNazoryAuthorAdminPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  redirect(`/autori/${userId}`);
}
