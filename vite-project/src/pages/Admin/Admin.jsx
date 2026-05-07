import { useState,useEffect } from "react";
import Home from "./Dashboard";
import Header from "../../Attributes/header";
import Inventory from "./Inventory";
import Requisition from "./requisitions";
import Orders from "./orders";
import Customers from "./customers";


function Admin() {
    const [activeSection, setActiveSection] = useState("Home");
    const [open, setOpen] = useState(false);

    const changeSection = (section) => {
        if (activeSection === "Home" && section !== "Home") {
            window.history.pushState({ section }, "");
        }
        
        setActiveSection(section);
    };

    useEffect(() => {
        const handlePopState = () => {
            setActiveSection("Home");
            setOpen(false); // Close dropdown when navigating back to Home
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    

    return (   
        <div className="min-h-screen bg-gray-100  px-4 flex flex-col  text-gray-700">
            <div  className="max-w-[1400px] mx-auto flex-1 w-full">
                <Header activeSection={activeSection} 
                        dropDown={["Home", "Inventory", "Customers", "Requisitions", "Orders"]} 
                        open={open}
                    setOpen={setOpen}
                    setActiveSection={changeSection} /> 
                <div >
                    {activeSection === "Home" && <Home 
                        activeSection={activeSection} 
                        setActiveSection={changeSection}/>
                        }
                    {activeSection === "Inventory" && <Inventory 
                        activeSection={activeSection} 
                        setActiveSection={changeSection} 
                        />}
                    {activeSection === "Customers" && <Customers 
                        activeSection={activeSection} 
                        setActiveSection={changeSection } 
                        />}
                    {activeSection === "Requisitions" && <Requisition 
                        activeSection={activeSection} 
                        setActiveSection={changeSection} 
                        />}
                    {activeSection === "Orders" && <Orders 
                        activeSection={activeSection} 
                        setActiveSection={changeSection} 
                        />}
                </div>
            </div>
            
        </div>
        
    );
}

export default Admin;