// enter в однострочном поле не отправляет всю форму: сохранение только кнопкой или ctrl+s
export function keepEnter(event: React.KeyboardEvent<HTMLFormElement>): void {
  const target = event.target as HTMLElement;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    event.currentTarget.requestSubmit();
    return;
  }

  if (event.key === 'Enter' && target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit') {
    event.preventDefault();
  }
}
