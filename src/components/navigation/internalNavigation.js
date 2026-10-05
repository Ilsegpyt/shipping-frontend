import {
    LayoutDashboard,
    Users,
    Building2,
    UserRoundCog,
    FileText,
} from "lucide-react";

export const getInternalNavigation = (user) => [
    {
        section: "Main",
        items: [
            {
                label: "Dashboard",
                path: "/dashboard",
                icon: LayoutDashboard,
            },
        ],
    },
    {
        section: "Management",
        items: [
            {
                label: "Users",
                path: "/users",
                permission: "identity.users.view",
                icon: Users,
            },
            {
                label: "Account Managers",
                path: "/account-manager-assignments",
                permission: "identity.users.view",
                icon: UserRoundCog,
            },
            {
                label: "Customers",
                path: "/customers",
                permission: "customers.view",
                icon: Building2,
            },
            ...(user?.roleName === "Super Admin"
                ? [
                    {
                        label: "Content Management",
                        path: "/content",
                        icon: FileText,
                    },
                ]
                : []),
        ],
    },
];