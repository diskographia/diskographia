'use client';

import { useRef, useState } from 'react';

interface PendingFilesProps {
  files: File[];
  onChange: (files: File[]) => void;
}

// файлы для нового предмета собираются до создания и уходят на сервер сразу после него
export function PendingFiles({ files, onChange }: PendingFilesProps) {
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);

  const add = (list: FileList | null) => {
    if (list && list.length > 0) {
      onChange([...files, ...Array.from(list)]);
    }
  };

  return (
    <div
      className="drop drop-list"
      data-over={over ? '' : undefined}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);

        if (depth.current === 0) {
          setOver(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setOver(false);
        add(event.dataTransfer.files);
      }}
    >
      {files.length === 0 ? (
        <p className="hint">Перетащите сюда картинки, звук, видео или модель, либо выберите кнопкой. Первое фото станет обложкой.</p>
      ) : (
        <ul>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="hint">{Math.ceil(file.size / 1024)} КБ</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, at) => at !== index))}
                className="frame px-2"
                aria-label={`убрать ${file.name}`}
                title="убрать"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={picker}
        type="file"
        multiple
        onChange={(event) => {
          add(event.target.files);
          event.target.value = '';
        }}
        hidden
      />

      <button type="button" onClick={() => picker.current?.click()} className="frame mt-1 px-2">
        + файл
      </button>

      {over ? <span className="drop-note">Отпустите файлы.</span> : null}
    </div>
  );
}
