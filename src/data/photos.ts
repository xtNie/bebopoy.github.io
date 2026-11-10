import data from './albums.json';
export type Photo = {id:string;src:string;alt:string;width:number;height:number;takenAt?:string;variants?:{src:string;width:number;height:number}[];credit?:{name:string;url:string};camera?:string;lens?:string;settings?:string};
export type Album = {slug:string;title:string;titleEn:string;description:string;location:string;category:string;year:number;demo:boolean;cover:string;photos:Photo[]};
export const albums = data as Album[];
export const coverOf = (album:Album) => album.photos.find(p=>p.id===album.cover) || album.photos[0];
export const allPhotos = albums.flatMap(album=>album.photos.map(photo=>({...photo,album})));
// New imports append entries. Prefer them when capture dates are equal or missing.
export const recentPhotos = allPhotos
  .map((photo, index) => ({photo, index, timestamp: photo.takenAt ? Date.parse(photo.takenAt) : -Infinity}))
  .sort((a, b) => (b.timestamp - a.timestamp) || (b.index - a.index))
  .map(({photo}) => photo);
