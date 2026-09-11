// все адреса строятся отсюда: перевод на английский правит этот файл и имена папок

export const SIGN_IN_SEGMENT = 'vhod';
export const EDIT_SEGMENT = 'pravka';
export const SEARCH_SEGMENT = 'poisk';
export const CREATE_SEGMENT = 'sozdat';
export const SUMMARY_SEGMENT = 'svodka';
export const INBOX_SEGMENT = 'uvedomleniya';
export const SETTINGS_SEGMENT = 'nastroiki';
export const MINE_SEGMENT = 'moi';
export const APPLICATIONS_SEGMENT = 'zayavki';
export const TRASH_SEGMENT = 'korzina';
export const MODERATION_SEGMENT = 'moderaciya';

export interface SearchParams {
  q?: string;
  tag?: string;
  kind?: string;
}

export const routes = {
  home: () => '/',

  signIn: () => `/${SIGN_IN_SEGMENT}`,

  create: () => `/${CREATE_SEGMENT}`,

  summary: () => `/${SUMMARY_SEGMENT}`,

  inbox: () => `/${INBOX_SEGMENT}`,

  settings: () => `/${SETTINGS_SEGMENT}`,

  mine: () => `/${MINE_SEGMENT}`,

  applications: () => `/${APPLICATIONS_SEGMENT}`,

  trash: () => `/${TRASH_SEGMENT}`,

  moderation: () => `/${MODERATION_SEGMENT}`,

  profile: (handle: string) => `/@${handle}`,

  profileEdit: () => `/${EDIT_SEGMENT}`,

  entity: (handle: string, slug: string) => `/@${handle}/${slug}`,

  entitySelected: (handle: string, slug: string, selectedSlug: string) =>
    `/@${handle}/${slug}?selected=${encodeURIComponent(selectedSlug)}`,

  entityEdit: (handle: string, slug: string) => `/@${handle}/${slug}/${EDIT_SEGMENT}`,

  search: (params: SearchParams = {}) => {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value) {
        query.set(key, value);
      }
    }

    const suffix = query.toString();

    return suffix ? `/${SEARCH_SEGMENT}?${suffix}` : `/${SEARCH_SEGMENT}`;
  },
};
