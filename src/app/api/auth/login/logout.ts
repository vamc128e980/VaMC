import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });

  // Clear both client-side and server-side cookies cleanly
  response.cookies.set('staff_role', '', {
    httpOnly: false,
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  });

  response.cookies.set('session_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  });

  return response;
}