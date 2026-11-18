// 2. POST: Login via Supabase staff_accounts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // FIX 1: Frontend nunchi 'pin', 'loginId', 'waiterName' ila eh peru tho vachina accept chesthundi
    const rawId = body?.identifier || body?.username || body?.name || body?.waiterName || body?.loginId || '';
    const cleanId = rawId.trim(); 
    const cleanPass = (body?.password || body?.pin || '').trim();

    if (!cleanId || !cleanPass) {
      return NextResponse.json(
        { error: 'Identifier and password are required.' },
        { status: 400 }
      );
    }

    // FIX 2: Variables chuttu double quotes ("") pettam. Deeni valla spaces unna names ki crash avvadu!
    const { data: users, error } = await supabase
      .from('staff_accounts')
      .select('role, identifier, password_hash, name')
      .or(`identifier.ilike."${cleanId}",name.ilike."${cleanId}"`);

    const user = users && users.length > 0 ? users[0] : null;

    // Password exact ga match ayyindo ledo check chesthundi
    if (error || !user || user.password_hash !== cleanPass) {
      console.error("Login Error:", error?.message || "Invalid password/ID");
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your details.' },
        { status: 401 }
      );
    }

    const role = user.role?.toLowerCase();
    const staffName = user.name || (role === 'admin' ? 'Royal Admin' : 'Floor Steward');
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
