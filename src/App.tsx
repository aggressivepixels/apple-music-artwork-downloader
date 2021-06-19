import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as Either from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import NProgress from "nprogress";
import { useEffect, useState } from "react";
import { useQuery } from "react-query";

type SearchResult = t.TypeOf<typeof SearchResultType>;
type FetchResultsOptions = { query: string; lang: string };

const artworkSizes = [500, 1000, 1400, 1500, 1600, 2000, 3000];
const langOptions = [
  { label: "English", value: "en_us" },
  { label: "日本語", value: "ja_jp" },
];

export function App() {
  const [query, setQuery] = useState(
    () => parseQueryString(window.location.search).query ?? ""
  );
  const [lang, setLang] = useState(
    () => parseQueryString(window.location.search).lang ?? langOptions[0].value
  );
  const [options, setOptions] = useState<FetchResultsOptions>({ query, lang });
  const results = useQuery<SearchResult[]>(
    ["results", options.query, options.lang],
    () => fetchResults(options),
    { enabled: options.query.length > 0 }
  );

  useEffect(() => {
    if (results.isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [results.isLoading]);

  useEffect(() => {
    if (options.query) {
      setQueryString(generateQueryString(options));
    } else {
      setQueryString("");
    }
  }, [options]);

  return (
    <main>
      <div className="section">
        <div className="container">
          <div className="block">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setOptions({ query, lang });
              }}
            >
              <div className="field has-addons">
                <div className="control is-expanded">
                  <input
                    className="input"
                    type="text"
                    value={query}
                    placeholder="Search"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <p className="control">
                  <span className="select">
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value)}
                    >
                      {langOptions.map(({ label, value }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </span>
                </p>
                <div className="control">
                  <button className="button is-info" type="submit">
                    <span className="icon">
                      <FontAwesomeIcon icon={faSearch} />
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {(results.data?.length ?? 0) > 0 ? (
        <div className="container">
          <div className="box mb-6">
            {results.data?.map((result) => (
              <article key={result.collectionId} className="media">
                <figure className="media-left">
                  <p className="image is-64x64">
                    <img
                      src={result.artworkUrl100}
                      alt={result.collectionName}
                    />
                  </p>
                </figure>
                <div className="media-content">
                  <div className="content">
                    <p>
                      <a
                        href={result.collectionViewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <strong>{result.collectionName}</strong>
                      </a>
                      <br />
                      {result.artistName}
                      <br />
                      {result.releaseDate.getFullYear()}
                      <br />
                      {result.trackCount === 1
                        ? "1 track"
                        : `${result.trackCount} tracks`}
                    </p>
                  </div>
                  <nav className="level">
                    <div className="level-left">
                      {artworkSizes.map((size) => {
                        const url = generateArtworkUrlFromThumbUrl(
                          result.artworkUrl100,
                          size
                        );
                        const filename = `${result.collectionName} - ${size}x${size}.jpg`;

                        return (
                          <a
                            key={size}
                            className="level-item"
                            href={generateArtworkUrlFromThumbUrl(
                              result.artworkUrl100,
                              size
                            )}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              triggerDownload(url, filename);
                            }}
                          >
                            {size}x{size}
                          </a>
                        );
                      })}
                    </div>
                  </nav>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

async function triggerDownload(url: string, filename: string): Promise<void> {
  NProgress.start();

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();

    link.parentNode?.removeChild(link);
  } catch (err) {
    throw err;
  } finally {
    NProgress.done();
  }
}

function setQueryString(value: string) {
  const newUrl =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname +
    value;

  window.history.pushState({ path: newUrl }, "", newUrl);
}

function parseQueryString(value: string): Record<string, string> {
  return value
    .slice(1)
    .split("&")
    .reduce((soFar, pair) => {
      const [key, value] = pair.split("=");
      return { ...soFar, [key]: decodeURIComponent(value) };
    }, {});
}

function generateQueryString(values: Record<string, string>): string {
  return (
    "?" +
    Object.entries(values)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")
  );
}

function generateArtworkUrlFromThumbUrl(
  thumbUrl: string,
  size: number
): string {
  return thumbUrl.replace(/100x100b[bf]\.(jpg|webp)/, `${size}x${size}bb.jpg`);
}

const IsoStringDate = new t.Type<Date, string, unknown>(
  "IsoStringDate",
  (u): u is Date => u instanceof Date,
  (u, c) =>
    pipe(
      t.string.validate(u, c),
      Either.chain((s) => {
        const d = new Date(s);
        return isNaN(d.getTime()) ? t.failure(u, c) : t.success(d);
      })
    ),
  (a) => a.toISOString()
);

const SearchResultType = t.type({
  artistName: t.string,
  artworkUrl100: t.string,
  collectionId: t.number,
  collectionName: t.string,
  collectionViewUrl: t.string,
  releaseDate: IsoStringDate,
  trackCount: t.number,
});

const SearchResultsType = t.type({
  results: t.array(SearchResultType),
});

async function fetchResults({
  query,
  lang,
}: FetchResultsOptions): Promise<SearchResult[]> {
  // TODO: The language options don't seem to do anything at all.

  const res = await fetch(
    `https://itunes.apple.com/search?media=music&entity=album&country=us&lang=${lang}&term=${encodeURIComponent(
      query
    )}`,
    { headers: { Accept: "application/json" } }
  );
  const data = await res.json();
  const { results } = fromDecoder(SearchResultsType, data);

  return results;
}

function fromDecoder<I, A>(decoder: t.Decoder<I, A>, value: I): A {
  const result = decoder.decode(value);
  if (Either.isLeft(result)) {
    throw new Error(PathReporter.report(result).join(", "));
  }

  return result.right;
}
