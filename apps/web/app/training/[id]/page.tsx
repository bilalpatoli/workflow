export default function TrainingPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Training {params.id}</h1>
    </main>
  );
}
