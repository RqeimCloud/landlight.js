// Named imports, so only these fields of the config reach the browser.
import { email, locales, phone, url } from '../site.config.json'

const context = document.modelContext ?? navigator.modelContext
const { name, description } = locales[document.documentElement.lang]

context.registerTool({
  name: 'get_business_info',
  description: `Returns the name, description, website, email and phone of ${name}.`,
  inputSchema: { type: 'object', properties: {} },
  execute: () => ({ name, description, url, email, phone }),
})

context.registerTool({
  name: 'read_site_guide',
  description: `Returns a summary of ${name} and links to every page of this website, as Markdown.`,
  inputSchema: { type: 'object', properties: {} },
  execute: async () => (await fetch('/llms.txt')).text(),
})
