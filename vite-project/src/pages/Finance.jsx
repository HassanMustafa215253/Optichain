import { useEffect, useMemo, useState } from "react";
import Header from "../Attributes/header";
import StatsCard from "../Attributes/statsCard";
import SalesChart from "../Attributes/Chart";
import { Users, ShoppingCart, Package, FileText } from "lucide-react";

const formatCurrency = (value) => {
    if (value == null) return "-";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumber = (value) => {
    if (value == null) return "-";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return numeric.toLocaleString();
};

const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString();
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

function FinanceHome({ pricing, costs, reports, setActiveSection }) {
    const margin = useMemo(() => {
        const valid = pricing.filter(
            (item) => Number(item.selling_price) > 0 && item.production_cost != null
        );
        if (valid.length === 0) return "-";
        const total = valid.reduce((sum, item) => {
            const price = Number(item.selling_price);
            const cost = Number(item.production_cost);
            return sum + ((price - cost) / price) * 100;
        }, 0);
        return `${(total / valid.length).toFixed(1)}%`;
    }, [pricing]);

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
                            onClick={() => setActiveSection("Pricing")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Pricing"
                                value={formatNumber(pricing.length)}
                                change=""
                                changeType="positive"
                                icon={ShoppingCart}
                                iconBgColor="bg-blue-100"
                                iconColor="text-blue-600"
                            />
                        </button>
                        <button
                            onClick={() => setActiveSection("Costs")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Costs"
                                value={formatNumber(costs.length)}
                                change=""
                                changeType="negative"
                                icon={Package}
                                iconBgColor="bg-amber-100"
                                iconColor="text-amber-600"
                            />
                        </button>
                        <button
                            onClick={() => setActiveSection("Reports")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Reports"
                                value={formatNumber(reports.length)}
                                change=""
                                changeType="positive"
                                icon={FileText}
                                iconBgColor="bg-green-100"
                                iconColor="text-green-600"
                            />
                        </button>
                        <div className="w-full block text-left">
                            <StatsCard
                                title="Avg Margin"
                                value={margin}
                                change=""
                                changeType="positive"
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
                    <h1 className="text-3xl font-semibold text-gray-800">Finance Focus</h1>
                    <p className="text-sm text-gray-500 mt-1">Branch financial priorities this week</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                    {[
                        {
                            title: "Pricing Review",
                            detail: `${formatNumber(pricing.length)} items tracked`,
                            meta: "Align margin targets",
                        },
                        {
                            title: "Transfer Costs",
                            detail: `${formatNumber(costs.length)} cost entries`,
                            meta: "Verify inter-branch spend",
                        },
                        {
                            title: "Monthly Reports",
                            detail: `${formatNumber(reports.length)} reports ready`,
                            meta: "Share with Central Admin",
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

function PricingSection({ items, onRefresh, setError }) {
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ cost: "", price: "" });

    const startEdit = (item) => {
        setEditingId(item.local_item_id);
        setForm({
            cost: item.production_cost == null ? "" : String(item.production_cost),
            price: item.selling_price == null ? "" : String(item.selling_price),
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ cost: "", price: "" });
    };

    const saveEdit = async (itemId) => {
        try {
            const payload = {
                production_cost: form.cost === "" ? null : Number(form.cost),
                selling_price: form.price === "" ? null : Number(form.price),
            };

            const response = await fetch(
                `http://localhost:8081/finance/pricing/${itemId}`,
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
                throw new Error("Failed to update pricing");
            }

            cancelEdit();
            onRefresh();
        } catch (err) {
            setError(`Failed to update pricing: ${err.message}`);
        }
    };

    const getMargin = (cost, price) => {
        if (!price) return "0%";
        const margin = ((price - cost) / price) * 100;
        return `${margin.toFixed(1)}%`;
    };

    return (
        <SectionShell title="Pricing">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[28%]">Item</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[16%]">Category</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[16%]">Cost</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[16%]">Price</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Margin</th>
                            <th className="px-4 py-2.5 text-right text-sm font-semibold text-gray-600 w-[12%]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items.map((item) => (
                            <tr key={item.local_item_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    <p className="font-semibold text-gray-900">{item.name ?? "-"}</p>
                                    <p className="text-xs text-gray-500">{item.local_item_id}</p>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {item.category_name ?? "-"}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {editingId === item.local_item_id ? (
                                        <input
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                            value={form.cost}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    cost: event.target.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        formatCurrency(item.production_cost)
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {editingId === item.local_item_id ? (
                                        <input
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                            value={form.price}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    price: event.target.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        formatCurrency(item.selling_price)
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {getMargin(Number(item.production_cost ?? 0), Number(item.selling_price ?? 0))}
                                </td>
                                <td className="px-4 py-2.5 text-sm">
                                    {editingId === item.local_item_id ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => saveEdit(item.local_item_id)}
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

function CostsSection({ costs }) {
    return (
        <SectionShell title="Transfer Costs">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[30%]">From Branch</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[30%]">To Branch</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[40%]">Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {costs.map((item, index) => (
                            <tr key={`${item.from_branch_id}-${item.to_branch_id}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">{item.from_branch_id ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{item.to_branch_id ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatCurrency(item.cost)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function ReportsSection({ reports }) {
    return (
        <SectionShell title="Branch Reports">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[25%]">Report Date</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[25%]">Sales</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[25%]">Production</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[25%]">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {reports.map((report, index) => (
                            <tr key={`${report.report_date}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatDate(report.report_date)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatNumber(report.sales)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatNumber(report.production_cost)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatNumber(report.operation_cost)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function Finance() {
    const [activeSection, setActiveSection] = useState("Home");
    const [open, setOpen] = useState(false);
    const [pricing, setPricing] = useState([]);
    const [costs, setCosts] = useState([]);
    const [reports, setReports] = useState([]);
    const [error, setError] = useState("");

    const changeSection = (section) => {
        if (activeSection === "Home" && section !== "Home") {
            window.history.pushState({ section }, "");
        }
        setActiveSection(section);
    };

    const fetchPricing = async () => {
        try {
            const response = await fetch("http://localhost:8081/finance/pricing", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch pricing");
            }
            const data = await response.json();
            setPricing(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    const fetchCosts = async () => {
        try {
            const response = await fetch("http://localhost:8081/finance/costs", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch costs");
            }
            const data = await response.json();
            setCosts(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    const fetchReports = async () => {
        try {
            const response = await fetch("http://localhost:8081/finance/reports", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch reports");
            }
            const data = await response.json();
            setReports(Array.isArray(data) ? data : []);
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
        fetchPricing();
        fetchCosts();
        fetchReports();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 px-4 flex flex-col text-gray-700">
            <div className="max-w-[1400px] mx-auto flex-1 w-full">
                <Header
                    activeSection={activeSection}
                    dropDown={["Home", "Pricing", "Costs", "Reports"]}
                    open={open}
                    setOpen={setOpen}
                    setActiveSection={changeSection}
                    userName="Finance Lead"
                    userEmail="finance@optichain.com"
                />
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 mb-4">
                        {error}
                    </div>
                )}
                <div>
                    {activeSection === "Home" && (
                        <FinanceHome
                            pricing={pricing}
                            costs={costs}
                            reports={reports}
                            setActiveSection={changeSection}
                        />
                    )}
                    {activeSection === "Pricing" && (
                        <PricingSection items={pricing} onRefresh={fetchPricing} setError={setError} />
                    )}
                    {activeSection === "Costs" && <CostsSection costs={costs} />}
                    {activeSection === "Reports" && <ReportsSection reports={reports} />}
                </div>
            </div>
        </div>
    );
}

export default Finance;
