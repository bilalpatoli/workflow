import fs from "node:fs";
import path from "node:path";

// Read the static homepage HTML at build time and inject its <style>, <body>,
// and <script> blocks so the URL stays "/" while the markup matches the source
// file in apps/web/public/home.html exactly.
function loadHome() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "public", "home.html"),
    "utf-8"
  );
  const style = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
  // Strip any inline <script> from the body string and capture its contents
  // separately so React can mount it via dangerouslySetInnerHTML.
  const scripts: string[] = [];
  const bodyWithoutScripts = body.replace(
    /<script[^>]*>([\s\S]*?)<\/script>/gi,
    (_, code) => {
      scripts.push(code);
      return "";
    }
  );
  return { style, body: bodyWithoutScripts, scripts };
}

export default function LandingPage() {
  const { style, body, scripts } = loadHome();
  return (
    <>
      {/* Hide the global site-header from layout.tsx so the homepage only
          shows its own nav. */}
      <style
        dangerouslySetInnerHTML={{
          __html: ".site-header{display:none!important}",
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: style }} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
      {scripts.map((code, i) => (
        <script key={i} dangerouslySetInnerHTML={{ __html: code }} />
      ))}
    </>
  );
}
