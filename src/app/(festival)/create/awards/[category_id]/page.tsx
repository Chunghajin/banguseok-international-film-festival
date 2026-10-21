import {notFound} from 'next/navigation';
import {isCategory} from '@/lib/award-state';
import AwardPicker from './picker';
export default async function CategoryPage({params}:{params:Promise<{category_id:string}>}){
 const {category_id}=await params;if(!isCategory(category_id))notFound();
 return <AwardPicker key={category_id} id={category_id}/>;
}
