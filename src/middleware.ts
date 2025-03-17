import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Your middleware logic for Next.js
  // Example: Check authentication, redirect, modify request/response
  
  // If you want to continue the request
  return NextResponse.next();
  
  // If you want to redirect
  // return NextResponse.redirect(new URL('/login', request.url));
  
  // If you want to return a response
  // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}