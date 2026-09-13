// enter в однострочном поле не отправляет всю форму: сохранение только кнопкой
export function keepEnter(event: React.KeyboardEvent<HTMLFormElement>): void {
  const target = event.target as HTMLElement;

  if (event.key === 'Enter' && target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit') {
    event.preventDefault();
  }
}
