import {
    HeartPulse,
    Car,
    Wind,
    ShoppingBag,
    Factory,
    Cpu,
    Globe2,
    ArrowUpRight,
} from 'lucide-react';

const industryConfig = {
    healthcare: {
        icon: HeartPulse,
        label: 'Healthcare logistics',
        color: 'text-sky-400',
        bg: 'bg-sky-400/10',
    },

    automotive: {
        icon: Car,
        label: 'Automotive logistics',
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
    },

    energy: {
        icon: Wind,
        label: 'Energy logistics',
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
    },

    retail: {
        icon: ShoppingBag,
        label: 'Retail logistics',
        color: 'text-violet-400',
        bg: 'bg-violet-400/10',
    },

    industrial: {
        icon: Factory,
        label: 'Industrial logistics',
        color: 'text-orange-400',
        bg: 'bg-orange-400/10',
    },

    technology: {
        icon: Cpu,
        label: 'Technology logistics',
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
    },
};

function IndustryHeroVisual({ industry = 'healthcare' }) {
    const config = industryConfig[industry] ?? industryConfig.healthcare;
    const Icon = config.icon;

    return (
        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.12),transparent_32%)]" />

            {/* Decorative grid */}
            <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '42px 42px',
                }}
            />

            {/* Main visual */}
            <div className="relative flex min-h-[430px] items-center justify-center">
                <div className="absolute h-72 w-72 rounded-full border border-white/10" />
                <div className="absolute h-52 w-52 rounded-full border border-white/10" />
                <div className="absolute h-32 w-32 rounded-full border border-white/10" />

                <div
                    className={`relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 ${config.bg} ${config.color} shadow-2xl backdrop-blur-md`}
                >
                    <Icon size={52} strokeWidth={1.5} />
                </div>

                <div className="absolute left-[18%] top-[25%] flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 backdrop-blur-md">
                    <Globe2 size={20} />
                </div>

                <div className="absolute right-[18%] top-[35%] flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 backdrop-blur-md">
                    <ArrowUpRight size={20} />
                </div>

                <div className="absolute bottom-[27%] left-[25%] h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.8)]" />
                <div className="absolute right-[28%] bottom-[24%] h-2 w-2 rounded-full bg-white/60" />
            </div>

            {/* Bottom information card */}
            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-white">
                            {config.label}
                        </p>

                        <p className="mt-1 text-sm text-white/50">
                            Integrated logistics solutions
                        </p>
                    </div>

                    <div className={`rounded-xl ${config.bg} p-3 ${config.color}`}>
                        <Icon size={22} strokeWidth={1.7} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default IndustryHeroVisual;