export const site = {
  name: 'Sutton', title: 'Sutton · 光影与日常',
  description: '去一些地方，拍一些照。一本持续更新的摄影集，也留下一些日常与文字。',
  email: 'xiangtongnie@gmail.com', github: 'https://github.com/xtNie',
};
export const url = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const photoUrl = (path: string) => path.startsWith('https://') ? path : url(path);
