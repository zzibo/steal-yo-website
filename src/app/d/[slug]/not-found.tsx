export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="font-serif text-4xl font-bold">Card not found</h1>
      <p className="text-neutral-400 mt-2">This date card doesn&apos;t exist or was removed.</p>
      <a
        href="/"
        className="mt-6 rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors"
      >
        Create a card
      </a>
    </main>
  );
}
