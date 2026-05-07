import { useEffect, useState } from "react";
import { Clock, CheckCircle,FileText } from "lucide-react";

function Drawer({ title, config, data,checkVar}) {

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All
                </button>
            </div>
            <div className="p-6 space-y-3">
        
                {data.map((req) => {
                    keyVar=getKey(checkVar)
                    const configItem = config[keyVar] ?? config.false;
                    const StatusIcon = configItem.icon;
                    
                    return (
                        <div key={req.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{req.id}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {config.label}
                            </span>
                        </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
export default Drawer;