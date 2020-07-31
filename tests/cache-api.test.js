import { dot } from "/base/build/streaming-dot.js";

function getArticles() {
  return Promise.resolve(
    [1, 2, 3].map((v) => {
      return {
        link: `/${v}.html`,
        title: `Article #${v}`,
      };
    })
  );
}

describe("streaming dot with Cache API", function () {
  before(async function () {
    const cache = await caches.open("test-cache");
    cache.put("/header.html", new Response(`<header>Header</header>`));
    cache.put("/footer.html", new Response(`<footer>Footer</footer>`));
  });

  after(async function () {
    await caches.delete("test-cache");
  });

  it("works with more elaborate responses", async function () {
    const result = await new Response(dot`
		<!doctype html>
		${caches.match("/header.html")}
		${fetch("data:text/html,<main>Article</main>")}
		<h1>Other articles</h1>
		<ul>
			${(await getArticles()).map(
        (article) => dot`
						<li><a href="${article.link}">${article.title}</a></li>
					`
      )}
		</ul>
		${caches.match("/footer.html")}
	`).text();

    expect(result).to.contain('<li><a href="/2.html">Article #2</a></li>');
    expect(result).to.contain("<main>Article</main>");
  });
});
