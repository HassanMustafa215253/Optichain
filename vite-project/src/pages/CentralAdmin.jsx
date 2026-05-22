import { useEffect, useState } from "react";
import Header from "../Attributes/header";
import StatsCard from "../Attributes/statsCard";
import SalesChart from "../Attributes/Chart";
import { Users, ShoppingCart, Package, FileText } from "lucide-react";

const statusStyles = {
    Active: "bg-green-50 text-green-700 border-green-200",
    Paused: "bg-amber-50 text-amber-700 border-amber-200",
    Pending: "bg-gray-50 text-gray-600 border-gray-200",
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

function StatusBadge({ label }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border ${
                statusStyles[label] ?? statusStyles.Pending
            }`}
        >
            {label}
        </span>
    );
}

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

function CentralAdminHome({ branches, managers, reports, setActiveSection }) {
    const totalSales = branches.reduce(
        (sum, item) => sum + Number(item.total_sales ?? 0),
        0
    );

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
                            onClick={() => setActiveSection("Branches")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Branches"
                                value={formatNumber(branches.length)}
                                change=""
                                changeType="positive"
                                icon={Package}
                                iconBgColor="bg-blue-100"
                                iconColor="text-blue-600"
                            />
                        </button>
                        <button
                            onClick={() => setActiveSection("Managers")}
                            className="w-full block text-left focus:outline-none"
                        >
                            <StatsCard
                                title="Managers"
                                value={formatNumber(managers.length)}
                                change=""
                                changeType="positive"
                                icon={Users}
                                iconBgColor="bg-green-100"
                                iconColor="text-green-600"
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
                                iconBgColor="bg-amber-100"
                                iconColor="text-amber-600"
                            />
                        </button>
                        <div className="w-full block text-left">
                            <StatsCard
                                title="Sales"
                                value={formatNumber(totalSales)}
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
                    <h1 className="text-3xl font-semibold text-gray-800">Global Actions</h1>
                    <p className="text-sm text-gray-500 mt-1">Branch activity based on live data</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                    {[
                        {
                            title: "Branches Reporting",
                            detail: `${formatNumber(reports.length)} reports logged`,
                            meta: `Latest: ${formatDate(reports[0]?.report_date)}`,
                        },
                        {
                            title: "Managers Assigned",
                            detail: `${formatNumber(managers.length)} active managers`,
                            meta: "Across all branches",
                        },
                        {
                            title: "Total Sales",
                            detail: `${formatNumber(totalSales)} revenue`,
                            meta: "All tracked months",
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

function BranchesSection({ branches }) {
    const [query, setQuery] = useState("");

    const filteredBranches = branches.filter((branch) => {
        const target = `${branch.branch_id ?? ""}`.toLowerCase();
        return target.includes(query.toLowerCase());
    });

    const getBranchStatus = (branch) =>
        Number(branch.total_sales ?? 0) > 0 ? "Active" : "Paused";

    return (
        <SectionShell
            title="Branches"
            actions={
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search branch ID"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
            }
        >
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[16%]">Branch ID</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Latest Report</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Sales</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Production</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[14%]">Operations</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[10%]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredBranches.map((branch) => (
                            <tr key={branch.branch_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {branch.branch_id ?? "-"}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {formatDate(branch.latest_report_date)}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {formatNumber(branch.total_sales)}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {formatNumber(branch.total_production_cost)}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {formatNumber(branch.total_operation_cost)}
                                </td>
                                <td className="px-4 py-2.5 text-sm">
                                    <StatusBadge label={getBranchStatus(branch)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionShell>
    );
}

function ManagersSection({ managers }) {
    return (
        <SectionShell title="Managers">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[24%]">Employee</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Branch</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Role</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Salary</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[18%]">Contact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {managers.map((manager) => (
                            <tr key={`${manager.employee_id}-${manager.branch_id}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    <p className="font-semibold text-gray-900">
                                        {manager.employee_name ?? manager.employee_id ?? "-"}
                                    </p>
                                    <p className="text-xs text-gray-500">{manager.employee_id ?? "-"}</p>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{manager.branch_id ?? "-"}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {manager.role_name ?? manager.role_id ?? "-"}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {formatNumber(manager.salary)}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-700">
                                    {manager.employee_email ?? manager.employee_phone ?? "-"}
                                </td>
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
        <SectionShell title="Financial Reports">
            <div className="theme-scrollbar overflow-auto h-full border border-gray-200 rounded-xl">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Branch</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Report Date</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Sales</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Production</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-600 w-[20%]">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {reports.map((report, index) => (
                            <tr key={`${report.branch_id}-${report.report_date}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm text-gray-700">{report.branch_id ?? "-"}</td>
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

function CentralAdmin() {
    const [activeSection, setActiveSection] = useState("Home");
    const [open, setOpen] = useState(false);
    const [branches, setBranches] = useState([]);
    const [managers, setManagers] = useState([]);
    const [reports, setReports] = useState([]);
    const [error, setError] = useState("");

    const changeSection = (section) => {
        if (activeSection === "Home" && section !== "Home") {
            window.history.pushState({ section }, "");
        }
        setActiveSection(section);
    };

    const fetchBranches = async () => {
        try {
            const response = await fetch("http://localhost:8081/centralAdmin/branches", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch branches");
            }
            const data = await response.json();
            setBranches(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    const fetchManagers = async () => {
        try {
            const response = await fetch("http://localhost:8081/centralAdmin/managers", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch managers");
            }
            const data = await response.json();
            setManagers(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(`Network error: ${err.message}`);
        }
    };

    const fetchReports = async () => {
        try {
            const response = await fetch("http://localhost:8081/centralAdmin/reports", {
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
        fetchBranches();
        fetchManagers();
        fetchReports();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 px-4 flex flex-col text-gray-700">
            <div className="max-w-[1400px] mx-auto flex-1 w-full">
                <Header
                    activeSection={activeSection}
                    dropDown={["Home", "Branches", "Managers", "Reports"]}
                    open={open}
                    setOpen={setOpen}
                    setActiveSection={changeSection}
                    userName="Central Admin"
                    userEmail="central@optichain.com"
                />
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 mb-4">
                        {error}
                    </div>
                )}
                <div>
                    {activeSection === "Home" && (
                        <CentralAdminHome
                            branches={branches}
                            managers={managers}
                            reports={reports}
                            setActiveSection={changeSection}
                        />
                    )}
                    {activeSection === "Branches" && <BranchesSection branches={branches} />}
                    {activeSection === "Managers" && <ManagersSection managers={managers} />}
                    {activeSection === "Reports" && <ReportsSection reports={reports} />}
                </div>
            </div>
        </div>
    );
}

export default CentralAdmin;
