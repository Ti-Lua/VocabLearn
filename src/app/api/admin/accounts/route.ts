import { NextResponse } from 'next/server';
import { getRegisteredAccounts } from '@/lib/accountManager';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get('download') === 'true';

    const accounts = getRegisteredAccounts();

    if (isDownload) {
      return new NextResponse(JSON.stringify(accounts, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="registered_accounts.json"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      total: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error('Lỗi API admin accounts:', error);
    return NextResponse.json({ error: 'Lỗi truy xuất danh sách tài khoản' }, { status: 500 });
  }
}
