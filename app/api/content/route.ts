import {getContent} from '@/lib/content';
export async function GET(){try{return Response.json(await getContent(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Контент временно недоступен. Попробуйте обновить страницу.'},{status:503})}}
