import { z } from 'zod';

// тексты проверок по-русски: их видят люди в формах
z.config(z.locales.ru());

export * from './entity.js';
export * from './entity-view.js';
export * from './entity-input.js';
export * from './profile-input.js';
export * from './slug.js';
export * from './session.js';
