export function NotFound() {
  return (
    <>
      <h2>Nie ma takiej strony</h2>
      <div className="card">
        <p>
          Adres <code>{window.location.hash || '#/'}</code> nie pasuje do żadnej trasy.
        </p>
        <p className="row">
          <a className="badge" href="#/">
            Wróć na start
          </a>
          <a className="badge" href="#/atlas">
            Atlas
          </a>
          <a className="badge" href="#/trener">
            Trener
          </a>
        </p>
      </div>
    </>
  );
}
