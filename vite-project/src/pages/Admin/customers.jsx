// Customers Page

import { useState, useEffect } from "react";

function Customers() {
    const [customers, setCustomers] = useState([]);
    const [error, setError] = useState("");
    const [modalType, setModalType] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
    });

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
    });

    const actionButtonClass =
        "h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm";

    const resetForm = () => {
        setForm({
            name: "",
            phone: "",
            email: "",
            address: "",
        });
    };

    const getCustomers = async () => {
        try {
            const response = await fetch("http://localhost:8081/admin/customers", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch customers");
            }

            const data = await response.json();
            setCustomers(data);
        } catch (err) {
            setError("Network error: " + err.message);
        }
    };

    useEffect(() => {
        getCustomers();
    }, []);

    const handleAddSubmit = async () => {
        try {
            const payload = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                address: form.address.trim(),
            };

            const response = await fetch("http://localhost:8081/admin/customers", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to add customer");
            }

            setModalType(null);
            resetForm();
            getCustomers();
        } catch (err) {
            setError("Failed to add customer: " + err.message);
        }
    };

    const startEdit = (item) => {
        setError("");
        setEditingId(item.id);
        setEditForm({
            name: item.name ?? "",
            phone: item.phone ?? "",
            email: item.email ?? "",
            address: item.address ?? "",
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", phone: "", email: "", address: "" });
    };

    const saveEdit = async (customerId) => {
        try {
            const payload = {
                name: editForm.name.trim(),
                phone: editForm.phone.trim(),
                email: editForm.email.trim(),
                address: editForm.address.trim(),
            };

            const response = await fetch(`http://localhost:8081/admin/customers/${customerId}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to update customer");
            }

            cancelEdit();
            getCustomers();
        } catch (err) {
            setError("Failed to update customer: " + err.message);
        }
    };

    const deleteCustomer = async (customerId) => {
        const confirmed = window.confirm("Delete this customer?");
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/admin/customers/${customerId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to delete customer");
            }

            if (editingId === customerId) {
                cancelEdit();
            }
            getCustomers();
        } catch (err) {
            setError("Failed to delete customer: " + err.message);
        }
    };

    return (
        <div className="h-screen px-4 py-2 flex items-center justify-center">
            <div className="w-full max-w-[1400px] h-[calc(100vh-28px)] mb-3 mx-auto flex flex-col rounded-2xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.07)] bg-white">
                <div className="flex items-end justify-between px-8 pt-4 pb-3 border-b border-gray-200">
                    <h2 className="text-[22px] font-semibold text-gray-900">Customers</h2>
                    <button
                        onClick={() => {
                            setError("");
                            setModalType("add");
                            resetForm();
                        }}
                        className="bg-gray-200 rounded-full p-1 hover:bg-gray-300 transition"
                    >
                        <div className="bg-white rounded-full px-6 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:scale-95 active:scale-90">
                            Add Customer
                        </div>
                    </button>
                </div>

                <div className="flex-1 m-2 p-4 overflow-hidden flex flex-col">
                    {error && <div className="text-red-500 mb-4">{error}</div>}

                    {customers.length === 0 && !error && (
                        <div className="text-gray-500">No customers found.</div>
                    )}

                    {customers.length > 0 && (
                        <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[6%]">ID</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[15%]">Name</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[15%]">Phone</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Email</th>
                                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Address</th>
                                        <th className="px-4 py-2.5 text-right text-sm font-semibold text-gray-600 w-[24%]">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {customers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{customer.id}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingId === customer.id ? (
                                                    <input
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    />
                                                ) : (
                                                    customer.name ?? "-"
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingId === customer.id ? (
                                                    <input
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={editForm.phone}
                                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                    />
                                                ) : (
                                                    customer.phone ?? "-"
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingId === customer.id ? (
                                                    <input
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={editForm.email}
                                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                    />
                                                ) : (
                                                    customer.email ?? "-"
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingId === customer.id ? (
                                                    <input
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={editForm.address}
                                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                    />
                                                ) : (
                                                    customer.address ?? "-"
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm">
                                                {editingId === customer.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => saveEdit(customer.id)}
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
                                                            onClick={() => startEdit(customer)}
                                                            className={`${actionButtonClass} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100`}
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCustomer(customer.id)}
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

            {modalType === "add" && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-white rounded-2xl w-[450px] p-8 shadow-xl">
                        <p className="text-xl font-semibold mb-6">Add Customer</p>
                        <div className="space-y-3">
                            <input
                                placeholder="Name"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                            <input
                                placeholder="Phone"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                            <input
                                placeholder="Email"
                                type="email"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                            <input
                                placeholder="Address"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setModalType(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 text-gray-600 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddSubmit}
                                className="bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-semibold"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Customers;
