/** Decorative marks stay outside film images and never carry the only state label. */
export default function Crayon({mark,className=''}:{mark:'laurel'|'circle'|'check'|'underline'|'pixel-star'|'pixel-trophy';className?:string}){
 return <span className={`crayon crayon-${mark} ${className}`} aria-hidden="true"/>;
}
