import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, isSuperUser } = body;

    if (!userId || typeof isSuperUser !== 'boolean') {
      return NextResponse.json(
        { error: "Missing userId or isSuperUser" },
        { status: 400 }
      );
    }

    // Update super user status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_super_user: isSuperUser })
      .eq('id', userId);

    if (updateError) {
      console.error('[SuperUser] Update error:', updateError);
      return NextResponse.json(
        { error: "Failed to update super user status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `User ${isSuperUser ? 'granted' : 'revoked'} super user status`,
      userId,
      isSuperUser
    });

  } catch (error) {
    console.error('[SuperUser] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all super users
    const { data: superUsers, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_super_user')
      .eq('is_super_user', true);

    if (error) {
      console.error('[SuperUser] Query error:', error);
      return NextResponse.json(
        { error: "Failed to fetch super users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ superUsers });

  } catch (error) {
    console.error('[SuperUser] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
