export const dynamic='force-dynamic';
export function GET(request:Request){
  if(new URL(request.url).search)return Response.json({success:false,dataQuality:'Unavailable'},{status:422,headers:{'Cache-Control':'no-store'}});
  return Response.json({status:'ok',app:'Voltarax frontend',dataQuality:'Calculated'},{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
