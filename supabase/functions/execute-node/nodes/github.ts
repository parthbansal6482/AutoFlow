import { 
  NodeData, 
  NodeParameters, 
  NodeResult, 
  CredentialData, 
  ok, 
  fail 
} from "../types.ts";

/**
 * Executes a GitHub API request.
 */
export async function executeGitHub(
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData
): Promise<NodeResult> {
  const repo = (parameters.repo as string) || "";
  const action = (parameters.action as string) || "create_issue";
  const token = (credentialData?.access_token as string) || (credentialData?.token as string) || (credentialData?.apiKey as string);

  if (!token) {
    return fail("Missing GitHub Access Token in credentials.", inputData);
  }

  if (!repo && action !== 'list_my_repos') {
    return fail("Repository (owner/repo) is required for this GitHub action.", inputData);
  }

  // Common title/body template resolution for issues
  const firstItem = inputData[0]?.json || {};
  let title = (parameters.title as string) || "New Issue from AutoFlow";
  let body = (parameters.body as string) || "Automated issue created by workflow.";

  const resolve = (txt: string) => txt.replace(/\{\{\s*\$input\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split('.');
    let val: any = firstItem;
    for (const part of parts) {
      val = val?.[part];
    }
    return String(val ?? "");
  });

  title = resolve(title);
  body = resolve(body);

  try {
    let url = "";
    let method = "GET";
    let payload: any = null;

    switch (action) {
      case "create_issue":
        url = `https://api.github.com/repos/${repo}/issues`;
        method = "POST";
        payload = { title, body };
        break;
      case "get_issue":
        const issueNumber = parameters.issueNumber || firstItem.issue_number;
        url = `https://api.github.com/repos/${repo}/issues/${issueNumber}`;
        break;
      case "list_prs":
        url = `https://api.github.com/repos/${repo}/pulls`;
        break;
      case "list_my_repos":
        url = `https://api.github.com/user/repos`;
        break;
      default:
        return fail(`Unsupported GitHub action: ${action}`, inputData);
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "AutoFlow-App"
      },
      body: payload ? JSON.stringify(payload) : null
    });

    if (!response.ok) {
      const errorData = await response.json();
      return fail(`GitHub API error: ${errorData.message || response.statusText}`, inputData);
    }

    const data = await response.json();
    return ok([{ json: data }]);
  } catch (err: unknown) {
    return fail(`Failed to connect to GitHub: ${err instanceof Error ? err.message : String(err)}`, inputData);
  }
}
