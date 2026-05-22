import { useEffect, useMemo, useState } from "react";
import Header from "../Attributes/header";
import StatsCard from "../Attributes/statsCard";
import SalesChart from "../Attributes/Chart";
import { Users, ShoppingCart, Package, FileText } from "lucide-react";

const ROLE_ID_MAP = {
    admin: 2,
    finance: 3,
    worker: 4,
};

const formatNumber = (value) => {
    if (value == null) return "-";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return numeric.toLocaleString();
};

const normalizeRole = (value) => String(value ?? "").toLowerCase();

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

function ManagerHome({ admins, finance, workers, orders, setActiveSection }) {
    const inProgress = orders.filter(
        (order) => normalizeRole(order.status) === "in progress"
    ).length;
    const delivered = orders.filter(
        (order) => normalizeRole(order.status) === "delivered"
    ).length;
    const cancelled = orders.filter(
        (order) => normalizeRole(order.status) === "cancelled"
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
                            onClick={() => setActiveSection("Admins")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Admins"
                                value={formatNumber(admins.length)}
                                change=""
                                changeType="positive"
                                icon={Users}
                                iconBgColor="bg-blue-100"
                                iconColor="text-blue-600"
                            />
                        </button>
                        <button
                            onClick={() => setActiveSection("Finance")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Finance"
                                value={formatNumber(finance.length)}
                                change=""
                                changeType="positive"
                                icon={FileText}
                                iconBgColor="bg-green-100"
                                iconColor="text-green-600"
                            />
                        </button>
                        <button
                            onClick={() => setActiveSection("Workers")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Workers"
                                value={formatNumber(workers.length)}
                                change=""
                                changeType="positive"
                                icon={Package}
                                iconBgColor="bg-amber-100"
                                iconColor="text-amber-600"
                            />
                        </button>
                        <div className="w-full block text-left">
                            <StatsCard
                                title="Branch Orders"
                                value={formatNumber(orders.length)}
                                change=""
                                changeType="positive"
                                icon={ShoppingCart}
                                iconBgColor="bg-purple-100"
                                iconColor="text-purple-600"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl flex flex-col mb-5 shadow-[0_12px_25px_rgba(0,0,0,0.07)]">
                <div className="border-b border-gray-200 py-5 px-11">
                    <h1 className="text-3xl font-semibold text-gray-800">Branch Priorities</h1>
                    <p className="text-sm text-gray-500 mt-1">Live order pipeline summary</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                    {[
                        {
                            title: "Orders In Progress",
                            detail: `${formatNumber(inProgress)} orders active`,
                            meta: "Monitoring fulfillment",
                        },
                        {
                            title: "Delivered",
                            detail: `${formatNumber(delivered)} orders completed`,
                            meta: "Closed this period",
                        },
                        {
                            title: "Cancelled",
                            detail: `${formatNumber(cancelled)} orders cancelled`,
                            meta: "Review exceptions",
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

function TeamSection({ title, members }) {
    return (
        <SectionShell title={title}>
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[26%]">Employee</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Branch</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Role</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Salary</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Contact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {members.map((member) => (
                            <tr key={`${member.employee_id}-${member.role_id}-${member.branch_id}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    <p className="font-semibold text-gray-900">
                                        {member.employee_name ?? member.employee_id ?? "-"}
                                    </p>
                                    <p className="text-xs text-gray-500">{member.employee_id ?? "-"}</p>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{member.branch_id ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {member.role_name ?? member.role_id ?? "-"}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {formatNumber(member.salary)}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {member.employee_email ?? member.employee_phone ?? "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function OrdersSection({ orders }) {
    return (
        <SectionShell title="Branch Orders">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Order</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Customer</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Order Date</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Final Date</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Price</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[12%]">Cost</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[10%]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {orders.map((order) => (
                            <tr key={order.order_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">{order.order_id}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{order.customer_name ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatDate(order.order_date)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatDate(order.final_date)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatNumber(order.price)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{formatNumber(order.cost)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{order.status ?? "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function Manager() {
    const [activeSection, setActiveSection] = useState("Home");
    const [open, setOpen] = useState(false);
    const [team, setTeam] = useState([]);
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState("");

    const changeSection = (section) => {
        if (activeSection === "Home" && section !== "Home") {
            window.history.pushState({ section }, "");
        }
        setActiveSection(section);
    };

    const matchesRole = (member, roleKey) => {
        const roleName = normalizeRole(member.role_name);
        if (roleName) {
            return roleName.includes(roleKey);
        }
        const roleId = Number(member.role_id);
        return roleId === ROLE_ID_MAP[roleKey];
    };

    const admins = useMemo(
        () => team.filter((member) => matchesRole(member, "admin")),
        [team]
    );
    const finance = useMemo(
        () => team.filter((member) => matchesRole(member, "finance")),
        [team]
    );
    const workers = useMemo(
        () => team.filter((member) => matchesRole(member, "worker")),
        [team]
    );

    const fetchTeam = async () => {
        try {
            const response = await fetch("http://localhost:8081/manager/team", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch team");
            }
            const data = await response.json();
            setTeam(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    const fetchOrders = async () => {
        try {
            const response = await fetch("http://localhost:8081/manager/orders", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch orders");
            }
            const data = await response.json();
            setOrders(Array.isArray(data) ? data : []);
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
        fetchTeam();
        fetchOrders();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 px-4 flex flex-col text-gray-700">
            <div className="max-w-[1400px] mx-auto flex-1 w-full">
                <Header
                    activeSection={activeSection}
                    dropDown={["Home", "Admins", "Finance", "Workers", "Orders"]}
                    open={open}
                    setOpen={setOpen}
                    setActiveSection={changeSection}
                    userName="Branch Manager"
                    userEmail="manager@optichain.com"
                />
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 mb-4">
                        {error}
                    </div>
                )}
                <div>
                    {activeSection === "Home" && (
                        <ManagerHome
                            admins={admins}
                            finance={finance}
                            workers={workers}
                            orders={orders}
                            setActiveSection={changeSection}
                        />
                    )}
                    {activeSection === "Admins" && <TeamSection title="Admin Team" members={admins} />}
                    {activeSection === "Finance" && <TeamSection title="Finance Team" members={finance} />}
                    {activeSection === "Workers" && <TeamSection title="Workers" members={workers} />}
                    {activeSection === "Orders" && <OrdersSection orders={orders} />}
                </div>
            </div>
        </div>
    );
}

export default Manager;
