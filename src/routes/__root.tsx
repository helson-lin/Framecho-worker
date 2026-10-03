import { Toasty } from "@cloudflare/kumo"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Framecho Cloud" },
      {
        name: "description",
        content: "Screenshot sharing powered by Framecho",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/logo.png" },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Toasty>{children}</Toasty>
        <Scripts />
      </body>
    </html>
  )
}
