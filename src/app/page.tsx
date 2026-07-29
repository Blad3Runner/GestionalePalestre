import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Gestionale Palestre</h1>
      <p className="lede">
        Step 1 of the build plan: the skeleton. No gyms, people, credits or bookings
        yet — those arrive one step at a time.
      </p>

      <div className="card">
        <h2>What works right now</h2>
        <p style={{ margin: 0 }}>
          The application runs and can talk to the database. You can check both on the{" "}
          <Link href="/health">health page</Link>.
        </p>
      </div>
    </main>
  );
}
