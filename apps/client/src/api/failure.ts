// сервер кладёт разбор по полям в issues, показываем его целиком. путь приходит строкой, но на всякий случай и массив
export async function failureText(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[]; issues?: { path?: string | (string | number)[]; message?: string }[] }
    | null;

  const issues = body?.issues
    ?.map((issue) => [Array.isArray(issue.path) ? issue.path.join('.') : issue.path, issue.message].filter(Boolean).join(': '))
    .filter(Boolean);

  if (issues && issues.length > 0) {
    return issues.join('; ');
  }

  if (Array.isArray(body?.message)) {
    return body.message.join('; ');
  }

  return body?.message ?? `сервер ответил ${response.status}`;
}
