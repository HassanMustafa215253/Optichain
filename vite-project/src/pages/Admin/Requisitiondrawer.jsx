import { useEffect, useState } from "react";
import { Clock, CheckCircle,FileText } from "lucide-react";

const RequisitionConfig = {
    false: { icon: Clock, color: "text-yellow-700", bg: "bg-yellow-100", label: "Pending Approval" },
    true: { icon: CheckCircle, color: "text-green-700", bg: "bg-green-100", label: "Approved", }
};

function RequisitionDrawer ({requisitions}){

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Requisitions</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All
                </button>
            </div>
            <div className="p-6 space-y-3">

                {requisitions.map((req) => {
                    const config = RequisitionConfig[req.approved] ?? RequisitionConfig.false;
                    const StatusIcon = config.icon;
                    
                    return (
                        <div
                        key={req.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                            {/* LEFT — DECISION CONTEXT */}
                            <div className="flex items-center gap-4 flex-1">
                                {/* Quantity (high signal) */}
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                                <span className="text-lg font-semibold text-gray-900">
                                    {req.sales_order_quantity}
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase">
                                    Qty
                                </span>
                                </div>

                                {/* Location Flow */}
                                <div className="flex-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                    <span>{req.city_name}, {req.country_name}</span>
                                    <span>•</span>
                                    <span>ID {req.source} </span>
                                </div>

                                {/* Secondary info */}
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span>
                                    Item: {req.item_name}
                                    </span>
                                </div>
                                </div>
                            </div>

                            {/* RIGHT — STATUS & META */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                Req# {req.id}
                                </span>

                                <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}
                                >
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
export default RequisitionDrawer;