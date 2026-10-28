import { graphRequest } from "./graphClient.js";
import { redactSecrets } from "./metaSecurity.js";

/**
 * Subscribe or unsubscribe the Page leadgen field. App-level callback URL
 * still has to be saved in the Meta Developer dashboard.
 *
 * @param {object} integration
 * @param {(page: object) => string} readToken
 */
export async function syncPageSubscriptions(integration, readToken) {
  for (const page of integration.pages || []) {
    const token = readToken(page);
    if (!token) {
      page.leadSubscribed = false;
      page.subscriptionError = page.selected ? "Page access token is missing. Reconnect Meta." : "";
      continue;
    }
    try {
      if (page.selected) {
        await graphRequest("POST", `/${page.pageId}/subscribed_apps`, {
          token,
          query: { subscribed_fields: "leadgen" },
        });
        page.leadSubscribed = true;
        page.subscriptionError = "";
      } else if (page.leadSubscribed) {
        await graphRequest("DELETE", `/${page.pageId}/subscribed_apps`, { token });
        page.leadSubscribed = false;
        page.subscriptionError = "";
      }
    } catch (error) {
      page.subscriptionError = redactSecrets(error.message).slice(0, 300);
      if (!page.selected) page.leadSubscribed = false;
    }
  }
}
