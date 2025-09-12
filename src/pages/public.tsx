import { createClient } from '@/util/supabase/static-props'

interface Country {
  [key: string]: unknown;
}

export default function PublicPage({ data }: { data?: Country[] }) {
  return <pre>{data && JSON.stringify(data, null, 2)}</pre>
}

export async function getStaticProps() {
  const supabase = createClient()

  const { data, error } = await supabase.from('countries').select()

  if (error || !data) {
    return { props: {} }
  }

  return { props: { data } }
}