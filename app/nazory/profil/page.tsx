import { AuthorProfileForm } from "@/components/nazory/AuthorProfileForm";

export const dynamic = "force-dynamic";

export default function NazoryProfilePage() {
  return (
    <div className="vx-live vx-sub nazory-page">
      <h1 className="section-h">MŮJ AUTORSKÝ PROFIL</h1>
      <AuthorProfileForm />
    </div>
  );
}
