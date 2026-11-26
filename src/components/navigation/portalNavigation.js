import { LayoutDashboard, Users, UserRound } from 'lucide-react';

export const customerTeamAccessLink = { label: 'Team Access', path: '/customer/team-access', icon: Users, description: 'Manage your team and account access.' };

export const customerNavigation = [{
    section: 'Customer Portal',
    items: [
        { label: 'Dashboard', path: '/customer', icon: LayoutDashboard, end: true },
        customerTeamAccessLink,
    ],
}];

export const subaccountNavigation = [{
    section: 'Subaccount Portal',
    items: [{ label: 'Dashboard', path: '/subaccount', icon: LayoutDashboard, end: true }],
}];

export const customerProfileLink = { label: 'My Profile', path: '/customer/profile', icon: UserRound, description: 'Manage your personal information.' };
export const subaccountProfileLink = { ...customerProfileLink, path: '/subaccount/profile' };
