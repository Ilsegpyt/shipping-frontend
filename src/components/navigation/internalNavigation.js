import {
    LayoutDashboard,
    Users,
    Building2,
    UserRoundCog,
    CalendarDays,
    Ship,
    FileText,
    Bell,
    History,
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

            ...(user?.roleName === "Account Manager"
                ? [
                    {
                        label: "Scheduling",
                        path: "/schedules",
                        permission: "customers.view",
                        icon: CalendarDays,
                    },
                    {
                        label: "Shipments",
                        path: "/shipments",
                        permission: "customers.view",
                        icon: Ship,
                    },
                ]
                : [
                    {
                        label: "Clients Search History",
                        path: "/clients/search-history",
                        permission: "customers.view",
                        icon: History,
                    },
                ]),
        ],
    },

    {
        section: "Operations",
        items: [
            ...(user?.roleName !== "Account Manager"
                ? [
                    {
                        label: "Scheduling",
                        path: "/schedules",
                        permission: "schedules.view",
                        icon: CalendarDays,
                    },
                    {
                        label: "Shipments",
                        path: "/shipments",
                        permission: "shipments.view",
                        icon: Ship,
                    },
                ]
                : []),

            {
                label: "Reports",
                path: "/reports",
                permission: "reports.view",
                icon: FileText,
            },
        ],
    },

    {
        section: "System",
        items: [
            {
                label: "Notifications",
                path: "/notifications",
                permission: "notifications.view",
                icon: Bell,
            },
        ],
    },
];