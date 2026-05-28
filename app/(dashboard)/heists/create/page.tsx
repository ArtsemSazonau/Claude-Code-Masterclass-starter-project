import Link from "next/link"
import CreateHeistForm from "@/components/CreateHeistForm"

export default function CreateHeistPage() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h2 className="form-title">Brief a New Heist</h2>
        <CreateHeistForm />
        <p className="text-center mt-4 text-sm text-body">
          <Link href="/heists" className="underline hover:text-heading">
            ← Back to heists
          </Link>
        </p>
      </div>
    </div>
  )
}
