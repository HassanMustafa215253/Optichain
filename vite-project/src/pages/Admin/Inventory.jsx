import { useState, useEffect } from "react";

function Inventory() {

    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("inventory");

    const [modalType, setModalType] = useState(null);
    const [editingInventoryId, setEditingInventoryId] = useState(null);
    const [editingProductId, setEditingProductId] = useState(null);
    const [inventoryEditForm, setInventoryEditForm] = useState({
        item_name: "",
        quantity: ""
    });
    const [productEditForm, setProductEditForm] = useState({
        name: "",
        category_name: "",
        weight: "",
        selling_price: "",
        production_cost: ""
    });

    const [form, setForm] = useState({
        item_name: "",
        quantity: "",
        name: "",
        category_name: "",
        weight: "",
        selling_price: "",
        production_cost: ""
    });

    const resetForm = () => {
        setForm({
            item_name: "",
            quantity: "",
            name: "",
            category_name: "",
            weight: "",
            selling_price: "",
            production_cost: ""
        });
    };

    const getInventory = async () => {
        try {
            const response = await fetch("http://localhost:8081/admin/inventory", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch inventory");
            }

            const data = await response.json();
            setInventory(data);

        } catch (err) {
            setError("Network error: " + err.message);
        }
    };

    const getProducts = async () => {
        try {
            const response = await fetch("http://localhost:8081/admin/local_items", {
                credentials: "include"
            });

            const data = await response.json();
            setProducts(data);

        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        getInventory();
        getProducts();
    }, []);

    const handleInventorySubmit = async () => {
        try {
            const payload = {
                item_name: form.item_name.trim(),
                quantity: Number(form.quantity)
            };

            const response = await fetch("http://localhost:8081/admin/inventory", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Failed to add inventory item");
            }

            setModalType(null);
            resetForm();
            getInventory();
        } catch (err) {
            setError("Failed to add inventory item: " + err.message);
        }
    };

    const startInventoryEdit = (item) => {
        setError("");
        setEditingInventoryId(item.id);
        setInventoryEditForm({
            item_name: item.item_name ?? "",
            quantity: String(item.quantity)
        });
    };

    const cancelInventoryEdit = () => {
        setEditingInventoryId(null);
        setInventoryEditForm({ item_name: "", quantity: "" });
    };

    const saveInventoryEdit = async (inventoryId) => {
        try {
            const payload = {
                item_name: inventoryEditForm.item_name.trim(),
                quantity: Number(inventoryEditForm.quantity)
            };

            const response = await fetch(`http://localhost:8081/admin/inventory/${inventoryId}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Failed to update inventory item");
            }

            cancelInventoryEdit();
            getInventory();
        } catch (err) {
            setError("Failed to update inventory item: " + err.message);
        }
    };

    const deleteInventoryItem = async (inventoryId) => {
        const confirmed = window.confirm("Delete this inventory row?");
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/admin/inventory/${inventoryId}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to delete inventory item");
            }

            if (editingInventoryId === inventoryId) {
                cancelInventoryEdit();
            }
            getInventory();
        } catch (err) {
            setError("Failed to delete inventory item: " + err.message);
        }
    };

    const handleProductSubmit = async () => {
        try {
            const payload = {
                name: form.name,
                category_name: form.category_name,
                weight: Number(form.weight),
                selling_price: form.selling_price === "" ? null : Number(form.selling_price),
                production_cost: form.production_cost === "" ? null : Number(form.production_cost)
            };

            const response = await fetch("http://localhost:8081/admin/local_items", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Failed to add product");
            }

            setModalType(null);
            resetForm();
            getProducts();
        } catch (err) {
            setError("Failed to add product: " + err.message);
        }
    };

    const startProductEdit = (product) => {
        setError("");
        setEditingProductId(product.local_item_id);
        setProductEditForm({
            name: product.name ?? "",
            category_name: product.category_name ?? "",
            weight: String(product.weight ?? ""),
            selling_price: product.selling_price == null ? "" : String(product.selling_price),
            production_cost: product.production_cost == null ? "" : String(product.production_cost)
        });
    };

    const cancelProductEdit = () => {
        setEditingProductId(null);
        setProductEditForm({
            name: "",
            category_name: "",
            weight: "",
            selling_price: "",
            production_cost: ""
        });
    };

    const saveProductEdit = async (productId) => {
        try {
            const payload = {
                name: productEditForm.name,
                category_name: productEditForm.category_name,
                weight: Number(productEditForm.weight),
                selling_price: productEditForm.selling_price === "" ? null : Number(productEditForm.selling_price),
                production_cost: productEditForm.production_cost === "" ? null : Number(productEditForm.production_cost)
            };

            const response = await fetch(`http://localhost:8081/admin/local_items/${productId}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Failed to update product");
            }

            cancelProductEdit();
            getProducts();
            getInventory();
        } catch (err) {
            setError("Failed to update product: " + err.message);
        }
    };

    const deleteProduct = async (productId) => {
        const confirmed = window.confirm("Delete this product?");
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8081/admin/local_items/${productId}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to delete product");
            }

            if (editingProductId === productId) {
                cancelProductEdit();
            }
            getProducts();
            getInventory();
        } catch (err) {
            setError("Failed to delete product: " + err.message);
        }
    };

    // Shared button style — matches Update/Delete pill style
    const actionButtonClass =
        "h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm";

    return (
        <div className="h-screen px-4 py-2 flex items-center justify-center">

            <div className="w-full max-w-[1200px] max-h-[calc(100vh-28px)] mb-3 mx-auto flex flex-col rounded-2xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.07)] bg-white">

                {/* Header */}
                <div className="flex items-end justify-between px-8 pt-4 pb-3 border-b border-gray-200">

                    <div className="relative w-[330px]">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab("inventory")}
                                className={`w-1/2 text-left pb-3 text-[17px] font-semibold transition-colors ${
                                    activeTab === "inventory" ? "text-gray-900" : "text-gray-400"
                                }`}
                            >
                                Inventory
                            </button>

                            <button
                                onClick={() => setActiveTab("products")}
                                className={`w-1/2 text-left pb-3 text-[17px] font-semibold transition-colors ${
                                    activeTab === "products" ? "text-gray-900" : "text-gray-400"
                                }`}
                            >
                                Products
                            </button>
                        </div>

                        <span
                            className={`absolute left-0 bottom-0 h-[3px] w-1/2 rounded-full bg-gray-900 transition-transform duration-300 ${
                                activeTab === "inventory" ? "translate-x-0" : "translate-x-full"
                            }`}
                        />
                    </div>

                    <button
                        onClick={() => {
                            setError("");
                            setModalType(activeTab);
                        }}
                        className="bg-gray-200 rounded-full p-1 hover:bg-gray-300 transition"
                    >
                        <div className="bg-white rounded-full px-6 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:scale-95 active:scale-90">
                            Add
                        </div>
                    </button>

                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 m-2 p-4 overflow-hidden flex flex-col">

                    {error && (
                        <div className="text-red-500 mb-4">
                            {error}
                        </div>
                    )} 

                    {activeTab === "inventory" && inventory.length === 0 && !error && (
                        <div className="text-gray-500">No inventory items found.</div>
                    )}

                    {activeTab === "products" && products.length === 0 && !error && (
                        <div className="text-gray-500">No products found.</div>
                    )}

                    {/* ── INVENTORY TABLE ── */}
                    {activeTab === "inventory" && inventory.length > 0 && (
                        <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                            <table className="w-full table-fixed border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="w-[8%]  px-4 py-2.5 text-left text-sm font-semibold text-gray-600">ID</th>
                                        <th className="w-[12%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Branch ID</th>
                                        <th className="w-[35%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Item Name</th>
                                        <th className="w-[20%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Quantity</th>
                                        <th className="w-[25%] px-4 py-2.5 text-right text-sm font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {inventory.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.id}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700">{item.branch_id}</td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingInventoryId === item.id ? (
                                                    <select
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={inventoryEditForm.item_name}
                                                        onChange={(e) =>
                                                            setInventoryEditForm({
                                                                ...inventoryEditForm,
                                                                item_name: e.target.value
                                                            })
                                                        }
                                                    >
                                                        {products.map((p) => (
                                                            <option key={p.local_item_id} value={p.name}>
                                                                {p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    item.item_name
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingInventoryId === item.id ? (
                                                    <input
                                                        type="number"
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={inventoryEditForm.quantity}
                                                        onChange={(e) =>
                                                            setInventoryEditForm({
                                                                ...inventoryEditForm,
                                                                quantity: e.target.value
                                                            })
                                                        }
                                                    />
                                                ) : (
                                                    item.quantity
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingInventoryId === item.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => saveInventoryEdit(item.id)}
                                                            className={`${actionButtonClass} bg-green-50 text-green-700 border border-green-200 hover:bg-green-100`}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelInventoryEdit}
                                                            className={`${actionButtonClass} bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100`}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startInventoryEdit(item)}
                                                            className={`${actionButtonClass} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100`}
                                                            title="Update"
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            onClick={() => deleteInventoryItem(item.id)}
                                                            className={`${actionButtonClass} bg-red-50 text-red-700 border border-red-200 hover:bg-red-100`}
                                                            title="Delete"
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

                    {/* ── PRODUCTS TABLE ── */}
                    {activeTab === "products" && products.length > 0 && (
                        <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                            <table className="w-full table-fixed border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="w-[6%]  px-4 py-2.5 text-left text-sm font-semibold text-gray-600">ID</th>
                                        <th className="w-[16%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Name</th>
                                        <th className="w-[14%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Category</th>
                                        <th className="w-[10%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Weight</th>
                                        <th className="w-[14%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Selling Price</th>
                                        <th className="w-[16%] px-4 py-2.5 text-left text-sm font-semibold text-gray-600">Production Cost</th>
                                        <th className="w-[24%] px-4 py-2.5 text-right text-sm font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {products.map((product) => (
                                        <tr
                                            key={product.id ?? product.local_item_id}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {product.id ?? product.local_item_id}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700 font-medium">
                                                {editingProductId === product.local_item_id ? (
                                                    <input
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={productEditForm.name}
                                                        onChange={(e) =>
                                                            setProductEditForm({ ...productEditForm, name: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    product.name
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingProductId === product.local_item_id ? (
                                                    <input
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={productEditForm.category_name}
                                                        onChange={(e) =>
                                                            setProductEditForm({ ...productEditForm, category_name: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    product.category_name ?? "-"
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingProductId === product.local_item_id ? (
                                                    <input
                                                        type="number"
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={productEditForm.weight}
                                                        onChange={(e) =>
                                                            setProductEditForm({ ...productEditForm, weight: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    product.weight ?? "-"
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingProductId === product.local_item_id ? (
                                                    <input
                                                        type="number"
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={productEditForm.selling_price}
                                                        onChange={(e) =>
                                                            setProductEditForm({ ...productEditForm, selling_price: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    product.selling_price ?? "-"
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingProductId === product.local_item_id ? (
                                                    <input
                                                        type="number"
                                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                                        value={productEditForm.production_cost}
                                                        onChange={(e) =>
                                                            setProductEditForm({ ...productEditForm, production_cost: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    product.production_cost ?? "-"
                                                )}
                                            </td>

                                            <td className="px-4 py-2.5 text-sm text-gray-700">
                                                {editingProductId === product.local_item_id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => saveProductEdit(product.local_item_id)}
                                                            className={`${actionButtonClass} bg-green-50 text-green-700 border border-green-200 hover:bg-green-100`}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelProductEdit}
                                                            className={`${actionButtonClass} bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100`}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startProductEdit(product)}
                                                            className={`${actionButtonClass} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100`}
                                                            title="Update"
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            onClick={() => deleteProduct(product.local_item_id)}
                                                            className={`${actionButtonClass} bg-red-50 text-red-700 border border-red-200 hover:bg-red-100`}
                                                            title="Delete"
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


            {/* MODAL */}
            {modalType && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center">

                    <div className="bg-white rounded-2xl w-[450px] p-8 shadow-xl">

                        <p className="text-xl font-semibold mb-6">
                            {modalType === "inventory" ? "Add Inventory Item" : "Add Product"}
                        </p>

                        {modalType === "inventory" && (
                            <>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm"
                                    value={form.item_name}
                                    onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                                >
                                    <option value="">Select Product</option>
                                    {products.map((p) => (
                                        <option key={p.local_item_id} value={p.name}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="number"
                                    placeholder="Quantity"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm"
                                    value={form.quantity}
                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                />
                            </>
                        )}

                        {modalType === "products" && (
                            <div className="space-y-3">
                                <input
                                    placeholder="Product Name"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                                <input
                                    placeholder="Category"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    value={form.category_name}
                                    onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Weight"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    value={form.weight}
                                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Selling Price"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    value={form.selling_price}
                                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Production Cost"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    value={form.production_cost}
                                    onChange={(e) => setForm({ ...form, production_cost: e.target.value })}
                                />
                            </div>
                        )}

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
                                onClick={
                                    modalType === "inventory"
                                        ? handleInventorySubmit
                                        : handleProductSubmit
                                }
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

export default Inventory;