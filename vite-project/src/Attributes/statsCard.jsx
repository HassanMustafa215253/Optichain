export function StatsCard({
    title, 
    value, 
    change, 
    changeType, 
    icon,
    iconBgColor,
    iconColor 
}){
    const Icon = icon;
    return(
        <div className="
        bg-white rounded-lg border border-gray-200 p-5
        shadow-lg transition transform duration-200 ease-in-out
        hover:shadow-2xl hover:-translate-y-2 hover:scale-101
        focus-within:shadow-2xl focus-within:-translate-y-2 focus-within:scale-101
        cursor-pointer
        "
        tabIndex={0}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                <p className="mb-1 text-2xl font-semibold text-gray-900">{title}</p>
                <p className="text-md font-semibold text-gray-600">{value}</p>
                <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${
                        changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {change}
                    </span>
                    <span className="text-sm text-gray-500">vs last month</span>
                </div>
                </div>
                <div className={`w-12 h-12 rounded-lg ${iconBgColor} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
            </div>
        </div>
    );
}
export default StatsCard;