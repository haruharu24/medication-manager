import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPanel } from './AccountPanel';
import { StoredAuth } from '../utils/auth';
import { Household, HouseholdMember } from '../utils/household';
import { ApiError } from '../utils/api';
import { SubscriptionInfo } from '../utils/subscription';

const auth: StoredAuth = { token: 'tok', user: { id: 'u1', email: 'alice@example.com' } };

// Most existing tests exercise the create/join forms, which are hidden behind the
// paywall unless the caller has an active subscription — default to 'active' here
// and override to 'none' in the paywall-specific tests below.
const activeSubscription: SubscriptionInfo = { status: 'active', productId: 'family_sharing_monthly', currentPeriodEnd: null };

const baseProps = {
  auth: null as StoredAuth | null,
  households: [] as Household[],
  activeHouseholdId: null as string | null,
  members: [] as HouseholdMember[],
  syncStatus: 'idle' as const,
  syncError: null as string | null,
  subscription: activeSubscription as SubscriptionInfo | null,
  onLogin: vi.fn(),
  onRegister: vi.fn(),
  onLogout: vi.fn(),
  onCreateHousehold: vi.fn(),
  onJoinHousehold: vi.fn(),
  onSelectHousehold: vi.fn(),
  onLeaveHousehold: vi.fn(),
  onUpdateMemberRole: vi.fn(),
  onTransferOwnership: vi.fn(),
  onDeleteAccount: vi.fn(),
  onPurchase: vi.fn(),
  onRestorePurchases: vi.fn(),
};

describe('AccountPanel (logged out)', () => {
  it('disables the login button until both fields are filled', async () => {
    const user = userEvent.setup();
    render(<AccountPanel {...baseProps} />);

    const submit = screen.getByRole('button', { name: 'ログインする' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByPlaceholderText('メールアドレス'), 'a@example.com');
    await user.type(screen.getByPlaceholderText('パスワード(8文字以上)'), 'password123');
    expect(submit).toBeEnabled();
  });

  it('calls onLogin with the entered credentials', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText('メールアドレス'), 'a@example.com');
    await user.type(screen.getByPlaceholderText('パスワード(8文字以上)'), 'password123');
    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    expect(onLogin).toHaveBeenCalledWith('a@example.com', 'password123');
  });

  it('switches to register mode and calls onRegister on submit', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} onRegister={onRegister} />);

    await user.click(screen.getByRole('button', { name: '新規登録' }));
    await user.type(screen.getByPlaceholderText('メールアドレス'), 'new@example.com');
    await user.type(screen.getByPlaceholderText('パスワード(8文字以上)'), 'password123');
    await user.click(screen.getByRole('button', { name: 'アカウントを作成する' }));

    expect(onRegister).toHaveBeenCalledWith('new@example.com', 'password123');
  });

  it('shows an error message when login fails', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue(new Error('メールアドレスまたはパスワードが違います'));
    render(<AccountPanel {...baseProps} onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText('メールアドレス'), 'a@example.com');
    await user.type(screen.getByPlaceholderText('パスワード(8文字以上)'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'ログインする' }));

    expect(await screen.findByText('メールアドレスまたはパスワードが違います')).toBeInTheDocument();
  });
});

describe('AccountPanel (logged in, no household yet)', () => {
  it('creates a household with the entered name', async () => {
    const user = userEvent.setup();
    const onCreateHousehold = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} auth={auth} onCreateHousehold={onCreateHousehold} />);

    await user.type(screen.getByPlaceholderText('例: 田中家'), 'テスト家族');
    await user.click(screen.getByRole('button', { name: '作成' }));

    expect(onCreateHousehold).toHaveBeenCalledWith('テスト家族');
  });

  it('joins a household with the entered invite code', async () => {
    const user = userEvent.setup();
    const onJoinHousehold = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} auth={auth} onJoinHousehold={onJoinHousehold} />);

    await user.type(screen.getByPlaceholderText('招待コード'), 'ABCD1234');
    await user.click(screen.getByRole('button', { name: '参加' }));

    expect(onJoinHousehold).toHaveBeenCalledWith('ABCD1234');
  });
});

describe('AccountPanel (subscription paywall)', () => {
  const noSubscription: SubscriptionInfo = { status: 'none', productId: null, currentPeriodEnd: null };

  it('shows the paywall instead of create/join forms when there is no active subscription', () => {
    render(<AccountPanel {...baseProps} auth={auth} subscription={noSubscription} />);

    expect(screen.getByText('家族共有は月額プラン')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('例: 田中家')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('招待コード')).not.toBeInTheDocument();
  });

  it('treats grace_period as entitled and shows the create/join forms', () => {
    render(<AccountPanel {...baseProps} auth={auth} subscription={{ status: 'grace_period', productId: null, currentPeriodEnd: null }} />);

    expect(screen.queryByText('家族共有は月額プラン')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('例: 田中家')).toBeInTheDocument();
  });

  it('calls onPurchase when the purchase button is clicked', async () => {
    const user = userEvent.setup();
    const onPurchase = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} auth={auth} subscription={noSubscription} onPurchase={onPurchase} />);

    await user.click(screen.getByRole('button', { name: '月額¥500で登録する' }));
    expect(onPurchase).toHaveBeenCalledTimes(1);
  });

  it('calls onRestorePurchases when the restore button is clicked', async () => {
    const user = userEvent.setup();
    const onRestorePurchases = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} auth={auth} subscription={noSubscription} onRestorePurchases={onRestorePurchases} />);

    await user.click(screen.getByRole('button', { name: '購入を復元' }));
    expect(onRestorePurchases).toHaveBeenCalledTimes(1);
  });

  it('falls back to the paywall when a create attempt fails with SUBSCRIPTION_REQUIRED, even if the cached status looked active', async () => {
    const user = userEvent.setup();
    const err = new ApiError('家族共有には月額サブスクリプションが必要です');
    err.data = { code: 'SUBSCRIPTION_REQUIRED' };
    const onCreateHousehold = vi.fn().mockRejectedValue(err);
    render(<AccountPanel {...baseProps} auth={auth} subscription={activeSubscription} onCreateHousehold={onCreateHousehold} />);

    await user.type(screen.getByPlaceholderText('例: 田中家'), 'テスト家族');
    await user.click(screen.getByRole('button', { name: '作成' }));

    expect(await screen.findByText('家族共有は月額プラン')).toBeInTheDocument();
  });
});

describe('AccountPanel (logged in, active household)', () => {
  const household: Household = { id: 'h1', name: 'テスト家族', inviteCode: 'ABCD1234', ownerId: 'u1' };
  const members: HouseholdMember[] = [
    { userId: 'u1', email: 'alice@example.com', role: 'owner', joinedAt: '2026-08-01T00:00:00.000Z' },
    { userId: 'u2', email: 'bob@example.com', role: 'editor', joinedAt: '2026-08-02T00:00:00.000Z' },
  ];

  it('shows the household name, invite code, and member list', () => {
    render(<AccountPanel {...baseProps} auth={auth} households={[household]} activeHouseholdId="h1" members={members} />);

    expect(screen.getByText('テスト家族')).toBeInTheDocument();
    expect(screen.getByText(/ABCD1234/)).toBeInTheDocument();
    expect(screen.getAllByText('alice@example.com').length).toBeGreaterThan(0);
    // Appears both in the member list row and in the new owner-transfer select's options.
    expect(screen.getAllByText('bob@example.com').length).toBeGreaterThan(0);
  });

  it('calls onLeaveHousehold when leaving', async () => {
    const user = userEvent.setup();
    const onLeaveHousehold = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} auth={auth} households={[household]} activeHouseholdId="h1" members={members} onLeaveHousehold={onLeaveHousehold} />);

    await user.click(screen.getByText('この世帯から退出する'));
    expect(onLeaveHousehold).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout when the logout icon is clicked', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<AccountPanel {...baseProps} auth={auth} onLogout={onLogout} />);

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows the owner badge for the owner and lets the owner change another member\'s role', async () => {
    const user = userEvent.setup();
    const onUpdateMemberRole = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} auth={auth} households={[household]} activeHouseholdId="h1" members={members} onUpdateMemberRole={onUpdateMemberRole} />);

    expect(screen.getByText('オーナー')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '閲覧のみ' }));
    expect(onUpdateMemberRole).toHaveBeenCalledWith('u2', 'viewer');
  });

  it('shows a static role badge (not a toggle) for a non-owner viewing another member', () => {
    const bobAuth: StoredAuth = { token: 'tok', user: { id: 'u2', email: 'bob@example.com' } };
    render(<AccountPanel {...baseProps} auth={bobAuth} households={[household]} activeHouseholdId="h1" members={members} />);

    // Bob (not the owner) sees Alice's role as a plain badge, not editable buttons.
    expect(screen.queryByRole('button', { name: '編集者' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '閲覧のみ' })).not.toBeInTheDocument();
  });

  it('shows a read-only notice when the signed-in user is a viewer', () => {
    const viewerMembers: HouseholdMember[] = [
      { userId: 'u1', email: 'alice@example.com', role: 'owner', joinedAt: '2026-08-01T00:00:00.000Z' },
      { userId: 'u2', email: 'bob@example.com', role: 'viewer', joinedAt: '2026-08-02T00:00:00.000Z' },
    ];
    const bobAuth: StoredAuth = { token: 'tok', user: { id: 'u2', email: 'bob@example.com' } };
    render(<AccountPanel {...baseProps} auth={bobAuth} households={[household]} activeHouseholdId="h1" members={viewerMembers} />);

    expect(screen.getByText('閲覧のみのメンバーです。お薬の追加・編集はできません。')).toBeInTheDocument();
  });

  it('shows the owner-transfer control only to the owner when there are other members', () => {
    const { rerender } = render(<AccountPanel {...baseProps} auth={auth} households={[household]} activeHouseholdId="h1" members={members} />);
    expect(screen.getByLabelText('移譲先のメンバー')).toBeInTheDocument();

    const bobAuth: StoredAuth = { token: 'tok', user: { id: 'u2', email: 'bob@example.com' } };
    rerender(<AccountPanel {...baseProps} auth={bobAuth} households={[household]} activeHouseholdId="h1" members={members} />);
    expect(screen.queryByLabelText('移譲先のメンバー')).not.toBeInTheDocument();
  });

  it('calls onTransferOwnership with the selected member after confirming', async () => {
    const user = userEvent.setup();
    const onTransferOwnership = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AccountPanel {...baseProps} auth={auth} households={[household]} activeHouseholdId="h1" members={members} onTransferOwnership={onTransferOwnership} />);

    await user.selectOptions(screen.getByLabelText('移譲先のメンバー'), 'u2');
    await user.click(screen.getByRole('button', { name: '移譲' }));

    expect(onTransferOwnership).toHaveBeenCalledWith('u2');
    vi.restoreAllMocks();
  });
});

describe('AccountPanel (account deletion)', () => {
  it('opens the delete-account modal and requires both password and the confirm word before submitting', async () => {
    const user = userEvent.setup();
    render(<AccountPanel {...baseProps} auth={auth} />);

    await user.click(screen.getByRole('button', { name: /アカウントを削除/ }));
    const submit = screen.getByRole('button', { name: '完全に削除する' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('パスワード'), 'password123');
    expect(submit).toBeDisabled(); // confirm word not yet typed

    await user.type(screen.getByLabelText('確認のため「削除」と入力してください'), '削除');
    expect(submit).toBeEnabled();
  });

  it('calls onDeleteAccount with the entered password', async () => {
    const user = userEvent.setup();
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
    render(<AccountPanel {...baseProps} auth={auth} onDeleteAccount={onDeleteAccount} />);

    await user.click(screen.getByRole('button', { name: /アカウントを削除/ }));
    await user.type(screen.getByLabelText('パスワード'), 'password123');
    await user.type(screen.getByLabelText('確認のため「削除」と入力してください'), '削除');
    await user.click(screen.getByRole('button', { name: '完全に削除する' }));

    expect(onDeleteAccount).toHaveBeenCalledWith('password123');
  });

  it('shows the server error, including blocking household names, when deletion is refused', async () => {
    const user = userEvent.setup();
    const apiError = Object.assign(new Error('先に権限を移譲してください'), {
      data: { households: [{ id: 'h1', name: 'テスト家族' }] },
    });
    const onDeleteAccount = vi.fn().mockRejectedValue(apiError);
    render(<AccountPanel {...baseProps} auth={auth} onDeleteAccount={onDeleteAccount} />);

    await user.click(screen.getByRole('button', { name: /アカウントを削除/ }));
    await user.type(screen.getByLabelText('パスワード'), 'password123');
    await user.type(screen.getByLabelText('確認のため「削除」と入力してください'), '削除');
    await user.click(screen.getByRole('button', { name: '完全に削除する' }));

    expect(await screen.findByText(/先に権限を移譲してください/)).toBeInTheDocument();
    expect(screen.getByText(/テスト家族/)).toBeInTheDocument();
  });
});
