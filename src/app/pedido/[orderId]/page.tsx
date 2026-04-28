// Dead route — kept only so the build doesn't fail.
// All order tracking happens at /pedido?id=ORDER_ID
export async function generateStaticParams() {
  return [{ orderId: '_' }]
}

export default function Page() {
  return null
}
