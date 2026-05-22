// Orders Page

import { useState, useEffect } from "react";

function Orders() {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        status: "",
        payment_done: "",
    });

    const actionButtonClass =
        "h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm";

    const getOrders = async () => {
        try {
            const response = await fetch("http://localhost:8081/admin/orders", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch orders");
            }

            const data = await response.json();
            setOrders(data);
        } catch (err) {
            setError("Network error: " + err.message);
        }
    };

    useEffect(() => {
        getOrders();
    }, []);

    const startEdit = (item) => {
        setError("");
        setEditingId(item.id);
        setEditForm({
            status: item.status ?? "",
            payment_done: String(item.payment_done ?? ""),
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ status: "", payment_done: "" });
    };

    const saveEdit = async (orderId) => {
        try {
            const payload = {
                status: editForm.status,
                payment_done: editForm.payment_done === "" ? 0 : Number(editForm.payment_done),
            };

            const response = await fetch(`http://localhost:8081/admin/orders/${orderId}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to update order");
            }

            cancelEdit();
            getOrders();
        } catch (err) {
            setError("Failed to update order: " + err.message);
        }
    };

    const deleteOrder = async (orderId) => {
        const confirmed = window.confirm("Delete this order?");
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/admin/orders/${orderId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to delete order");
            }

            if (editingId === orderId) {
                cancelEdit();
            }
            getOrders();
        } catch (err) {
            setError("Failed to delete order: " + err.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Delivered":
                return "text-green-600 font-semibold";
            case "In Progress":
                return "text-orange-600 font-semibold";
            case "Cancelled":
                return "text-red-600 font-semibold";
            default:
                return "text-gray-600";
        }
    };

    return (
        <div className="h-screen px-4 py-2 flex items-center justify-center">
            <div className="w-full max-w-[1400px] max-h-[calc(100vh-28px)] mb-3 mx-auto flex flex-col rounded-2xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.07)] bg-white">
                <div className="flex items-end justify-between px-8 pt-4 pb-3 border-b border-gray-200">
                    <h2 className="text-[22px] font-semibold text-gray-900">Orders</h2>
                </div>

                <div className="flex-1 min-h-0 m-2 p-4 overflow-hidden flex flex-col">
                    {error && <div className="text-red-500 mb-4">{error}</div>}

                    {orders.length === 0 && !error && (
                        <div className="text-gray-500">No orders found.</div>
                    )}

                    {orders.length > 0 && (
                        <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[6%]">ID</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[10%]">Customer</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[10%]">Order Date</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[10%]">Final Date</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[8%]">Price</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[8%]">Cost</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Status</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Payment Done</th>
                                        <th className="px-4 py-2.5 text-right text-sm font-semibold text-gray-600 w-[24%]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {[...orders]
                                        .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
                                        .map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{order.id}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{order.customer_name ?? "-"}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{formatDate(order.order_date)}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{formatDate(order.final_date)}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{order.price ?? "-"}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{order.cost ?? "-"}</td>

                                            <td className="px-4 py-2.5 text-sm">
                                                {editingId === order.id ? (
                                                    <select
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={editForm.status}
                                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                                    >
                                                        <option value="">Select Status</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Delivered">Delivered</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                    </select>
                                                ) : (
                                                    <span className={getStatusColor(order.status)}>{order.status ?? "-"}</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm">
                                                {editingId === order.id ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={editForm.payment_done}
                                                        onChange={(e) => setEditForm({ ...editForm, payment_done: e.target.value })}
                                                    />
                                                ) : (
                                                    <span
                                                        className={
                                                            Number(order.payment_done ?? 0) >= Number(order.price ?? 0)
                                                                ? "text-green-600 font-semibold"
                                                                : "text-red-600 font-semibold"
                                                        }
                                                    >
                                                        {order.payment_done ?? 0}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm">
                                                {editingId === order.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => saveEdit(order.id)}
                                                            className={`${actionButtonClass} bg-green-50 text-green-700 border border-green-200 hover:bg-green-100`}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className={`${actionButtonClass} bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100`}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startEdit(order)}
                                                            className={`${actionButtonClass} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100`}
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            onClick={() => deleteOrder(order.id)}
                                                            className={`${actionButtonClass} bg-red-50 text-red-700 border border-red-200 hover:bg-red-100`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Orders;
