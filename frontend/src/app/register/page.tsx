import { redirect } from 'next/navigation';

// /register redirects to the full school setup wizard at /signup
export default function RegisterPage() {
    redirect('/signup');
}
