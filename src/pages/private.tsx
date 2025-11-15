import type { GetServerSidePropsContext } from 'next'
import { createSessionClient } from '@/lib/appwrite'

interface User {
  $id: string;
  email: string;
  name: string;
}

export default function PrivatePage({ user }: { user: User }) {
  return <h1>Hello, {user.email || 'user'}!</h1>
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    const { account } = createSessionClient(context.req as any);
    const user = await account.get();

    return {
      props: {
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
        },
      },
    };
  } catch (_error) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
}