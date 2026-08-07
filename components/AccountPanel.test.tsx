import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPanel } from './AccountPanel';
import { StoredAuth } from '../utils/auth';
import { Household, HouseholdMember } from '../utils/household';

const auth: StoredAuth = { token: 'tok', user: { id: 'u1', email: 'alice@example.com' } };

const baseProps = {
  auth: null as StoredAuth | null,
  households: [] as Household[],
  activeHouseholdId: null as string | null,
  members: [] as HouseholdMember[],
  syncStatus: 'idle' as const,
  syncError: null as string | null,
  onLogin: vi.fn(),
  onRegister: vi.fn(),
  onLogout: vi.fn(),
  onCreateHousehold: vi.fn(),
  onJoinHousehold: vi.fn(),
  onSelectHousehold: vi.fn(),
  onLeaveHousehold: vi.fn(),
  onUpdateMemberRole: vi.fn(),
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
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
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
});
