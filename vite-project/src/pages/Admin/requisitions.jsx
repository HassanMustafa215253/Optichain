// Requisitions Page

import { useState, useEffect } from "react";

function Requisitions() {
    const [requisitions, setRequisitions] = useState([]);
    const [error, setError] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ approved: false });

    const actionButtonClass =
        "h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm";

    const getRequisitions = async () => {
        try {
            const response = await fetch("http://localhost:8081/admin/requisitions", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch requisitions");
            }

            const data = await response.json();
            setRequisitions(data);
        } catch (err) {
            setError("Network error: " + err.message);
        }
    };

    useEffect(() => {
        getRequisitions();
    }, []);

    const startEdit = (item) => {
        setError("");
        setEditingId(item.id);
        setEditForm({ approved: item.approved ?? false });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ approved: false });
    };

    const saveEdit = async (requisitionId) => {
        try {
            const payload = { approved: editForm.approved };

            const response = await fetch(`http://localhost:8081/admin/requisitions/${requisitionId}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to update requisition");
            }

            cancelEdit();
            getRequisitions();
        } catch (err) {
            setError("Failed to update requisition: " + err.message);
        }
    };

    const deleteRequisition = async (requisitionId) => {
        const confirmed = window.confirm("Delete this requisition?");
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/admin/requisitions/${requisitionId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to delete requisition");
            }

            if (editingId === requisitionId) {
                cancelEdit();
            }
            getRequisitions();
        } catch (err) {
            setError("Failed to delete requisition: " + err.message);
        }
    };

    return (
        <div className="h-screen px-4 py-2 flex items-center justify-center">
            <div className="w-full max-w-[1400px] h-[calc(100vh-28px)] mb-3 mx-auto flex flex-col rounded-2xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.07)] bg-white">
                <div className="flex items-end justify-between px-8 pt-4 pb-3 border-b border-gray-200">
                    <h2 className="text-[22px] font-semibold text-gray-900">Requisitions</h2>
                </div>

                <div className="flex-1 m-2 p-4 overflow-hidden flex flex-col">
                    {error && <div className="text-red-500 mb-4">{error}</div>}

                    {requisitions.length === 0 && !error && (
                        <div className="text-gray-500">No requisitions found.</div>
                    )}

                    {requisitions.length > 0 && (
                        <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[6%]">ID</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[10%]">Branch ID</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Item Name</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Quantity</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">City</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Country</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Approved</th>
                                        <th className="px-4 py-2.5 text-right text-sm font-semibold text-gray-600 w-[24%]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {[...requisitions]
                                        .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
                                        .map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.id}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.branch_id}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.item_name}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.sales_order_quantity}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.city_name ?? "-"}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.country_name ?? "-"}</td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingId === item.id ? (
                                                    <select
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={editForm.approved ? "true" : "false"}
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                approved: e.target.value === "true",
                                                            })
                                                        }
                                                    >
                                                        <option value="false">No</option>
                                                        <option value="true">Yes</option>
                                                    </select>
                                                ) : (
                                                    <span className={item.approved ? "text-green-600 font-semibold" : "text-red-600"}>
                                                        {item.approved ? "Yes" : "No"}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingId === item.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => saveEdit(item.id)}
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
                                                            onClick={() => startEdit(item)}
                                                            className={`${actionButtonClass} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100`}
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            onClick={() => deleteRequisition(item.id)}
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

export default Requisitions;
