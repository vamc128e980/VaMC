// 2. POST: Login via Supabase staff_accounts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Frontend nunchi em peru tho vachina theeskuntundi
    const rawId = body?.identifier || body?.username || body?.name || body?.waiterName || body?.loginId || '';
    const cleanId = rawId.trim().toLowerCase(); 
    const cleanPass = (body?.password || body?.pin || '').trim();

    if (!cleanId || !cleanPass) {
      return NextResponse.json(
        { error: 'Identifier and password are required.' },
        { status: 400 }
      );
    }

    // FIX: Supabase .or() query theesesi direct ga table data thechukuntunnam
    const { data: users, error } = await supabase
      .from('staff_accounts')
      .select('role, identifier, password_hash, name');

    if (error) {
      console.error("Database Fetch Error:", error.message);
      return NextResponse.json(
        { error: 'Database connection error.' }, 
        { status: 500 }
      );
    }

    // JavaScript lo case-insensitive ga match chesthunnam (Crash avve chance eh ledu)
    const user = users?.find(u => 
      (u.identifier || '').toLowerCase() === cleanId || 
      (u.name || '').toLowerCase() === cleanId
    );

    // Password verification
    if (!user || user.password_hash !== cleanPass) {
      console.error("Login Error: User not found or password mismatch");
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your details.' },
        { status: 401 }
      );
    }

    const role = user.role?.toLowerCase();
    const staffName = user.name || (role === 'admin' ? 'Royal Admin' : 'Floor Steward');
    
    // Token generation (mee existing function)
    const signedToken = signSession(role, staffName);

    const response = NextResponse.json({
      success: true,
      role,
      name: staffName
    });

    response.cookies.set('staff_role', role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    response.cookies.set('session_token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch (err) {
    console.error("Server catch block error:", err);
    return NextResponse.json({ error: 'Server authentication failed.' }, { status: 500 });
  }
}
