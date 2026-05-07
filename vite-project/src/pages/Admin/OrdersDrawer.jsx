import { useEffect, useState } from "react";
import { Clock, CheckCircle,FileText } from "lucide-react";

function getOrderConfig(order) {
    const now = new Date();
    const orderDate = new Date(order.order_date);
    const finalDate = new Date(order.final_date);
    const hours24 = 24 * 60 * 60 * 1000; // 24 hours in ms

    // If order is within 24 hours of orderDate -> Pending Approval
    if (now - orderDate <= hours24 && now >= orderDate) {
        return { icon: CheckCircle, color: "text-green-700", bg: "bg-green-100", label: "New Order" };
    }

    // If order is within 24 hours of finalDate -> Approved
    if (now - finalDate <= hours24 && now >= finalDate) {
        return { icon: Clock, color: "text-red-700", bg: "bg-red-100", label: "Deadline" };
    }

    // Default fallback
    return { icon: Clock, color: "text-red-700", bg: "bg-red-100", label: "Deadline" };
}

function OrdersDrawer ({Orders}){

    const filterOrders = Orders.filter(order => {
            const now = new Date();
            const orderDate = new Date(order.order_date);
            const finalDate = new Date(order.final_date);
    
            // Check if orderDate or finalDate is within last 24 hours
            const hours24 = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
            return (
                // (now - orderDate <= hours24 && now >= orderDate) || 
                // (now - finalDate <= hours24 && now >= finalDate)
                order
            );
        });

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">New Orders</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All
                </button>
            </div>
            <div className="p-6 space-y-3">

                {filterOrders.map((req) => {
                    const config = getOrderConfig(req);
                    const StatusIcon = config.icon;
                    
                    return (
                        <div
                            key={req.id}
                            className="flex items-center justify-between p-5 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                        >
                            {/* LEFT */}
                            <div className="flex items-center gap-5 flex-1">
                                
                                {/* Price */}
                                <div className="w-16 h-16 bg-gray-100 rounded-xl flex flex-col items-center justify-center">
                                    <span className="text-base font-semibold text-gray-900">
                                        ${req.price}
                                    </span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                                        Price
                                    </span>
                                </div>

                                {/* Main Info */}
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {req.customer_name || "Walk-in Customer"}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                        <span>
                                            Due: {new Date(req.final_date).toLocaleDateString()}
                                        </span>

                                        <span>
                                            {req.payment_done ? "Paid" : "Unpaid"}
                                        </span>

                                        <span className="text-gray-400">
                                            #{req.id}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT — Status Badge */}
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}
                            >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {config.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
export default OrdersDrawer;