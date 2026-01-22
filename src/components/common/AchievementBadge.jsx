import React, { memo } from 'react';
import { cn } from '../../utils';
import { ICON_MAP } from '../../constants';
import { Star, CheckCircle2 } from 'lucide-react';

export const AchievementBadge = memo(({ achievement, unlocked, darkMode }) => {
    const Icon = ICON_MAP[achievement.icon] || Star;

    return (
        <div className={cn(
            "flex-shrink-0 w-64 p-4 rounded-xl border transition-all flex items-center gap-4",
            unlocked
                ? darkMode ? "bg-amber-900/20 border-amber-700" : "bg-amber-50 border-amber-200"
                : darkMode ? "bg-slate-800 border-slate-700 opacity-60" : "bg-slate-50 border-slate-200 opacity-60"
        )}>
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                unlocked
                    ? darkMode ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-600"
                    : darkMode ? "bg-slate-700 text-slate-500" : "bg-slate-200 text-slate-400"
            )}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h4 className={cn("font-bold text-sm", darkMode ? "text-white" : "text-slate-800")}>{achievement.name}</h4>
                <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>{achievement.desc}</p>
            </div>
            {unlocked && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
        </div>
    );
});
