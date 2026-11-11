export const site = {
  name: 'Xiangtong Nie', title: 'Xiangtong Nie',
  description: 'Xiangtong Nie — University of Chinese Academy of Sciences. Research, writing, and photography.',
  affiliation: 'University of Chinese Academy of Sciences',
  email: 'xiangtongnie@gmail.com', github: 'https://github.com/xtNie',
};
export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const photoUrl = (path: string) => path.startsWith('https://') ? path : url(path);
