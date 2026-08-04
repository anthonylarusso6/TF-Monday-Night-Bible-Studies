"use client";
import { StudySection } from "@/lib/types";

/**
 * Renders a study that was written outside the app and pasted in.
 * These keep their original part-by-part structure rather than the
 * anchor-verse/breakdown shape that generated studies use.
 */
export default function StudySections({ sections }: { sections: StudySection[] }) {
  return (
    <>
      {sections.map((sec, i) => (
        <div key={i} className="sec">
          <div className="part-head">
            <span className="part-num">{i + 1}</span>
            <div>
              <div className="part-title">{sec.h}</div>
              {sec.sub && <div className="part-sub">{sec.sub}</div>}
            </div>
          </div>

          {sec.blocks.map((b, j) => {
            switch (b.t) {
              case "p":
                return <p key={j} className="part-p">{b.tx}</p>;

              case "list":
                return b.ord ? (
                  <ol key={j} className="part-list part-list-ord">
                    {b.items.map((it, k) => <li key={k}>{it}</li>)}
                  </ol>
                ) : (
                  <ul key={j} className="part-list">
                    {b.items.map((it, k) => <li key={k}>{it}</li>)}
                  </ul>
                );

              case "verse":
                return (
                  <div key={j} className="verse-box">
                    <b>{b.ref}</b>
                    <span>{b.tx}</span>
                  </div>
                );

              case "def":
                return (
                  <div key={j} className="part-def">
                    <b>{b.term}</b>
                    <span>{b.tx}</span>
                  </div>
                );

              case "q":
                return (
                  <div key={j} className="part-q">
                    <span className="part-q-label">Discussion</span>
                    <span className="part-q-text">{b.tx}</span>
                  </div>
                );

              case "table":
                return (
                  <div key={j} className="part-table-wrap">
                    <table className="part-table">
                      <thead>
                        <tr>
                          <th>{b.cols[0]}</th>
                          <th>{b.cols[1]}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.rows.map((r, k) => (
                          <tr key={k}>
                            <td>{r[0]}</td>
                            <td>{r[1]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

              case "quote":
                return <div key={j} className="part-quote">{b.tx}</div>;

              case "callout":
                return (
                  <div key={j} className="callout">
                    <b>{b.lb}</b>
                    {b.tx}
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>
      ))}
    </>
  );
}
