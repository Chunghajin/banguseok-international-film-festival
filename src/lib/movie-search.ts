export type SearchState = {query:string;page:number;composing:boolean};
export function readySearch({query,composing}:SearchState){const length=[...query.trim()].length;return !composing&&length>=1&&length<=100;}
export function mergeResults<T extends {tmdb_id:number}>(previous:T[],incoming:T[]){return [...new Map([...previous,...incoming].map(m=>[m.tmdb_id,m])).values()];}
