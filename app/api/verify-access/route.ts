import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { passcode } = await request.json()
  
  const validPasscode = process.env.PASSCODE
  
  if (!validPasscode) {
    return NextResponse.json(
      { error: 'Access system not configured' },
      { status: 500 }
    )
  }
  
  if (passcode === validPasscode) {
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json(
    { error: 'Invalid access code' },
    { status: 401 }
  )
}
