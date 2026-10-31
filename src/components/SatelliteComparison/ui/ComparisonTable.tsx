import { COMPARISON_COPY } from "../copy";

export function ComparisonTable() {
  return (
    <div className="sat-comparison__table-wrap">
      <table className="sat-comparison__table">
        <caption className="sr-only">Broadcast television satellite compared with low-Earth-orbit satellite internet</caption>
        <thead>
          <tr>
            <th scope="col">Spec</th>
            <th scope="col">TV Satellite</th>
            <th scope="col">Starlink</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_COPY.comparisonRows.map(([label, tv, leo]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{tv}</td>
              <td>{leo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
