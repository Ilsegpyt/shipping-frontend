import {
    LayoutDashboard,
    Users,
    Building2,
    UserRoundCog,
    FileText,
    MapPin,
    BriefcaseBusiness,
    FileCheck,
    UserPlus,
    Phone,
    ShieldCheck,
    Ship,
    FileSpreadsheet,
    Database,
    Truck,
    Container,
} from "lucide-react";

export const getInternalNavigation = (user) => [
    {
        section: "Main",
        items: [
            {
                label: "Dashboard",
                path: "/dashboard",
                permission: "reports.view",
                icon: LayoutDashboard,
            },
        ],
    },
    {
        section: "Operations",
        items: [
            {
                label: "Trucking",
                icon: Truck,
                subItems: [
                    {
                        label: "Transport Dashboard",
                        path: "/transport/dashboard",
                        isVisible: (user) => Boolean(
                            user?.isSuperAdmin ||
                            user?.role === "SuperAdmin" ||
                            user?.roleName === "Super Admin"
                        ),
                        icon: Ship,
                    },
                    {
                        label: "Transport Data Entry",
                        path: "/transport/entry",
                        permission: "operations.view",
                        icon: FileSpreadsheet,
                    },
                ],
            },
            {
                label: "FTL",
                icon: Container,
                badge: "Coming Soon",
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

            // Roles
            {
                label: "Roles",
                path: "/roles",
                permission: "identity.roles.manage",
                icon: ShieldCheck,
            },

            ...(user?.roleName === "Super Admin"
                ? [
                    {
                        label: "Operations Lookups",
                        path: "/operations-lookups",
                        icon: Database,
                    },
                    {
                        label: "Content Management",
                        path: "/content",
                        icon: FileText,
                    },
                    {
                        label: "Locations",
                        path: "/locations",
                        icon: MapPin,
                    },
                    {
                        label: "Agents Opportunities",
                        path: "/agent-opportunities",
                        icon: BriefcaseBusiness,
                    },
                    {
                        label: "Quotations",
                        path: "/quotations",
                        icon: FileCheck,
                    },
                    {
                        label: "Recruitments Requests",
                        path: "/recruitments",
                        icon: UserPlus,
                    },
                    {
                        label: "Contact Us",
                        path: "/contact-inquiries",
                        icon: Phone,
                    },
                ]
                : []),
        ],
    },
];
