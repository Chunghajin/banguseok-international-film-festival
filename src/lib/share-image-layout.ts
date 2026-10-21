// Full-width glyph estimate and explicit lines bound Satori's layout for 500-character titles.
export function imageText(text:string, width:number, height:number, preferred:number) {
  const characters = Array.from(text.normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu, ' '));
  let size = preferred;
  for (; size > 1; size--) {
    if (Math.ceil(characters.length / Math.max(1, Math.floor(width / size))) * size * 1.3 <= height) break;
  }
  const columns = Math.max(1, Math.floor(width / size));
  const lines = [];
  for (let index=0; index<characters.length; index+=columns) lines.push(characters.slice(index,index+columns).join(''));
  return {text:lines.join('\n'), fontSize:size};
}
