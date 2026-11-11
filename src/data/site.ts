export const site = {
  name: 'Sutton', title: 'Sutton · 摄影与文字',
  description: 'Sutton 的个人网站，摄影与文字。',
  email: 'xiangtongnie@gmail.com', github: 'https://github.com/xtNie',
};
export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const photoUrl = (path: string) => path.startsWith('https://') ? path : url(path);
