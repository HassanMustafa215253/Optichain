import { useEffect, useMemo, useState } from "react";
import Header from "../Attributes/header";
import StatsCard from "../Attributes/statsCard";
import SalesChart from "../Attributes/Chart";
import { Users, ShoppingCart, Package, FileText } from "lucide-react";

const LOW_STOCK_THRESHOLD = 20;

const formatNumber = (value) => {
    if (value == null) return "-";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return numeric.toLocaleString();
};

function SectionShell({ title, actions, children }) {
    return (
        <div className="h-screen px-4 py-2 flex items-center justify-center">
            <div className="w-full max-w-[1400px] max-h-[calc(100vh-28px)] mb-3 mx-auto flex flex-col rounded-2xl overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,0.07)] bg-white">
                <div className="flex items-end justify-between px-8 pt-4 pb-3 border-b border-gray-200">
                    <h2 className="text-[22px] font-semibold text-gray-900">{title}</h2>
                    {actions}
                </div>
                <div className="flex-1 min-h-0 m-2 p-4 overflow-hidden flex flex-col">{children}</div>
            </div>
        </div>
    );
}

function WorkerHome({ inventory, movements, replenishments, setActiveSection }) {
    const lowStockCount = inventory.filter(
        (item) => Number(item.quantity ?? 0) <= LOW_STOCK_THRESHOLD
    ).length;

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5">
                <div className="rounded-2xl lg:col-span-2 bg-white shadow-[0_12px_25px_rgba(0,0,0,0.07)]">
                    <SalesChart />
                </div>

                <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-2xl shadow-[0_12px_25px_rgba(0,0,0,0.07)]" />
                    <div className="relative grid grid-cols-1 gap-3 p-6">
                        <button
                            onClick={() => setActiveSection("Inventory")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Inventory"
                                value={formatNumber(inventory.length)}
                                change=""
                                changeType="positive"
                                icon={Package}
                                iconBgColor="bg-blue-100"
                                iconColor="text-blue-600"
                            />
                        </button>
                        <button
                            onClick={() => setActiveSection("Movements")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Movements"
                                value={formatNumber(movements.length)}
                                change=""
                                changeType="positive"
                                icon={ShoppingCart}
                                iconBgColor="bg-green-100"
                                iconColor="text-green-600"
                            />
                        </button>
                        <button
                            onClick={() => setActiveSection("Replenishment")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Replenish"
                                value={formatNumber(replenishments.length)}
                                change=""
                                changeType="positive"
                                icon={FileText}
                                iconBgColor="bg-amber-100"
                                iconColor="text-amber-600"
                            />
                        </button>
                        <div className="w-full block text-left">
                            <StatsCard
                                title="Low Stock"
                                value={formatNumber(lowStockCount)}
                                change=""
                                changeType="negative"
                                icon={Users}
                                iconBgColor="bg-purple-100"
                                iconColor="text-purple-600"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl flex flex-col mb-5 shadow-[0_12px_25px_rgba(0,0,0,0.07)]">
                <div className="border-b border-gray-200 py-5 px-11">
                    <h1 className="text-3xl font-semibold text-gray-800">Warehouse Focus</h1>
                    <p className="text-sm text-gray-500 mt-1">Inventory tasks based on live stock</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                    {[
                        {
                            title: "Low Stock Items",
                            detail: `${formatNumber(lowStockCount)} items below threshold`,
                            meta: "Review reorder requests",
                        },
                        {
                            title: "Movements Today",
                            detail: `${formatNumber(movements.length)} stock movements`,
                            meta: "Update bins",
                        },
                        {
                            title: "Replenishments",
                            detail: `${formatNumber(replenishments.length)} requests`,
                            meta: "Coordinate with manager",
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border border-gray-200 p-5 bg-gray-50"
                        >
                            <p className="text-lg font-semibold text-gray-900">{card.title}</p>
                            <p className="text-sm text-gray-600 mt-2">{card.detail}</p>
                            <p className="text-xs text-gray-400 mt-3">{card.meta}</p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function InventorySection({ items, onRefresh, setError }) {
    const [editingId, setEditingId] = useState(null);
    const [quantity, setQuantity] = useState("");

    const startEdit = (item) => {
        setEditingId(item.inventory_id);
        setQuantity(String(item.quantity ?? ""));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setQuantity("");
    };

    const saveEdit = async (inventoryId) => {
        try {
            const payload = {
                quantity: Number(quantity),
            };

            const response = await fetch(
                `http://localhost:8081/worker/inventory/${inventoryId}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update inventory");
            }

            cancelEdit();
            onRefresh();
        } catch (err) {
            setError(`Failed to update inventory: ${err.message}`);
        }
    };

    return (
        <SectionShell title="Inventory">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[30%]">Item</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Item ID</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Quantity</th>
                            <th className="px-4 py-2.5 text-right text-sm font-semibold text-gray-600 w-[30%]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items.map((item) => (
                            <tr key={item.inventory_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {item.item_name ?? "-"}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{item.local_item_id ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {editingId === item.inventory_id ? (
                                        <input
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                            value={quantity}
                                            onChange={(event) => setQuantity(event.target.value)}
                                        />
                                    ) : (
                                        formatNumber(item.quantity)
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-sm">
                                    {editingId === item.inventory_id ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => saveEdit(item.inventory_id)}
                                                className="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => startEdit(item)}
                                                className="h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                            >
                                                Update
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function MovementsSection({ movements }) {
    return (
        <SectionShell title="Stock Movements">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Movement</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[30%]">Item</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Quantity</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[30%]">Order</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {movements.map((move, index) => (
                            <tr key={`${move.movement_id ?? move.order_id}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {move.movement_id ?? move.order_id ?? "-"}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{move.item_name ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatNumber(move.quantity)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{move.order_id ?? "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function ReplenishmentSection({ replenishments }) {
    return (
        <SectionShell title="Replenishment">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[24%]">Request</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[30%]">Item</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Quantity</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[26%]">Approved</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {replenishments.map((request, index) => (
                            <tr key={`${request.requisition_id}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">{request.requisition_id ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{request.item_name ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatNumber(request.quantity)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {request.approved == null ? "-" : request.approved ? "Yes" : "No"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function Worker() {
    const [activeSection, setActiveSection] = useState("Home");
    const [open, setOpen] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [movements, setMovements] = useState([]);
    const [replenishments, setReplenishments] = useState([]);
    const [error, setError] = useState("");

    const changeSection = (section) => {
        if (activeSection === "Home" && section !== "Home") {
            window.history.pushState({ section }, "");
        }
        setActiveSection(section);
    };

    const fetchInventory = async () => {
        try {
            const response = await fetch("http://localhost:8081/worker/inventory", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch inventory");
            }
            const data = await response.json();
            setInventory(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    const fetchMovements = async () => {
        try {
            const response = await fetch("http://localhost:8081/worker/movements", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch movements");
            }
            const data = await response.json();
            setMovements(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    const fetchReplenishments = async () => {
        try {
            const response = await fetch("http://localhost:8081/worker/replenishments", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch replenishments");
            }
            const data = await response.json();
            setReplenishments(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    useEffect(() => {
        const handlePopState = () => {
            setActiveSection("Home");
            setOpen(false);
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    useEffect(() => {
        fetchInventory();
        fetchMovements();
        fetchReplenishments();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 px-4 flex flex-col text-gray-700">
            <div className="max-w-[1400px] mx-auto flex-1 w-full">
                <Header
                    activeSection={activeSection}
                    dropDown={["Home", "Inventory", "Movements", "Replenishment"]}
                    open={open}
                    setOpen={setOpen}
                    setActiveSection={changeSection}
                    userName="Warehouse Worker"
                    userEmail="worker@optichain.com"
                />
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 mb-4">
                        {error}
                    </div>
                )}
                <div>
                    {activeSection === "Home" && (
                        <WorkerHome
                            inventory={inventory}
                            movements={movements}
                            replenishments={replenishments}
                            setActiveSection={changeSection}
                        />
                    )}
                    {activeSection === "Inventory" && (
                        <InventorySection
                            items={inventory}
                            onRefresh={fetchInventory}
                            setError={setError}
                        />
                    )}
                    {activeSection === "Movements" && <MovementsSection movements={movements} />}
                    {activeSection === "Replenishment" && (
                        <ReplenishmentSection replenishments={replenishments} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default Worker;
