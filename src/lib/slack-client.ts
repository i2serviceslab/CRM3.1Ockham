const SLACK_API_BASE = 'https://slack.com/api';
const userNameCache = new Map<string, string>();

export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN);
}

export async function getSlackUserName(userId?: string): Promise<string> {
  if (!userId) return 'Usuario Slack';
  const cached = userNameCache.get(userId);
  if (cached) return cached;

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return userId;

  try {
    const res = await fetch(`${SLACK_API_BASE}/users.info?user=${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const name = data?.user?.profile?.display_name || data?.user?.real_name || data?.user?.name || userId;
    userNameCache.set(userId, name);
    return name;
  } catch {
    return userId;
  }
}

export async function postSlackMessage(params: {
  channel: string;
  text: string;
  threadTs?: string;
}): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: 'SLACK_BOT_TOKEN not configured' };
  }

  try {
    const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel: params.channel,
        text: params.text,
        ...(params.threadTs ? { thread_ts: params.threadTs } : {}),
      }),
    });
    const data = await res.json();
    return { ok: Boolean(data?.ok), ts: data?.ts, error: data?.error };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Slack API request failed' };
  }
}
