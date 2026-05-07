import { useState } from "react";
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatsCard from "../../Attributes/statsCard";
import SalesChart from "../../Attributes/Chart";
import { Users, ShoppingCart, Package, FileText } from 'lucide-react';
import RequisitionDrawer from "./Requisitiondrawer";
import OrdersDrawer from "./OrdersDrawer";

function Home({ activeSection, setActiveSection }) {
    const [requisitions, setRequisitions] = useState([]);
    const [Orders, setOrders] = useState([]);
    const [Error, setError] = useState([]);

    const getRequisitions = async () => {
        try {
            const response = await fetch("http://localhost:8081/admin/requisitions",{
                method: "GET",
                credentials: "include",  // this is required to send cookies
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

    const pendingRequisitions = requisitions.filter(
        (req) => req.approved === false
    );

    useEffect(() => {
        getRequisitions();
    }, []);

    const getOrders = async () => {
        try {
            const response = await fetch("http://localhost:8081/admin/orders",{
                method: "GET",
                credentials: "include",  // this is required to send cookies
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




    return(
        <>
            {/* Edge-to-edge constraint */}

                {/* MAIN ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5">

                    {/* LEFT: Chart */}
                    <div className="rounded-2xl lg:col-span-2 bg-white shadow-[0_12px_25px_rgba(0,0,0,0.07)]">
                        <SalesChart />
                    </div>

                    {/* RIGHT: Floating Card Platform */}
                    <div className="relative">
                        {/* Platform */}
                        <div className="absolute inset-0 bg-white rounded-2xl shadow-[0_12px_25px_rgba(0,0,0,0.07)]" />

                        {/* Cards */}
                        <div className="relative grid grid-cols-1 gap-3 p-6">
                            <button 
                                onClick={() => setActiveSection("Customers")}
                                className="w-full block text-left focus:outline-none"
                            >
                                <StatsCard
                                    title="Customers"
                                    value="2,845"
                                    change="+12.5%"
                                    changeType="positive"
                                    icon={Users}
                                    iconBgColor="bg-blue-100"
                                    iconColor="text-blue-600"
                                /></button>
                            <button 
                                onClick={() => setActiveSection("Orders")}
                                className="w-full block text-left focus:outline-none"
                            >
                                <StatsCard
                                    title="Orders"
                                    value="1,423"
                                    change="+8.2%"
                                    changeType="positive"
                                    icon={ShoppingCart}
                                    iconBgColor="bg-green-100"
                                    iconColor="text-green-600"
                            /></button>
                            <button 
                                onClick={() => setActiveSection("Inventory")}
                                className="w-full block text-left focus:outline-none"
                            >
                                <StatsCard
                                    title="Inventory"
                                    value="856"
                                    change="-3.1%"
                                    changeType="negative"
                                    icon={Package}
                                    iconBgColor="bg-purple-100"
                                    iconColor="text-purple-600"
                            /></button>
                            <button 
                                onClick={() => setActiveSection("Requisitions")} 
                                className="w-full block text-left focus:outline-none"
                            >
                                <StatsCard
                                    title="Requisitions"
                                    value="34"
                                    change="+5.7%"
                                    changeType="positive"
                                    icon={FileText}
                                    iconBgColor="bg-amber-100"
                                    iconColor="text-amber-600"
                            /></button>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="bg-white rounded-2xl flex flex-col mb-5 shadow-[0_12px_25px_rgba(0,0,0,0.07)]">
                        <div className="border-b border-gray-200 py-5 px-11">
                            <h1 className="text-3xl font-semibold text-gray-800">Updates</h1>
                        </div>
                        <div className=" grid grid-cols-2 gap-3 my-3 mx-6">
                            <RequisitionDrawer requisitions={pendingRequisitions}/>
                             <OrdersDrawer Orders={Orders}/>
                        </div>
                    </div>
                </div>
        </>
    )
}

export default Home;