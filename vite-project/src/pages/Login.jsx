import { useState } from "react";
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const emailRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("http://localhost:8081/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.response_code === 200) {
                if (data.role === "admin") navigate("/admin");
                else if (data.role === "central admin") navigate("/CentralAdmin");
                else if (data.role === "manager") navigate("/Manager");
                else if (data.role === "finance") navigate("/Finance");
                else if (data.role === "worker") navigate("/Worker");
                else navigate("/");
            } else {
                setError(data.code_desc || "Login failed");
            }
        } catch (err) {
            setError("Network error: " + err.message);
        }

        setLoading(false);
    };


    useEffect(() => {
        emailRef.current.focus();
    }, []);

    return (
       <>
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                {/* Centered container */}
                <div className="flex bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-4xl min-h-96 items-center">
                
                    {/* Left side: OptiChain */}
                    <div className="flex-1 flex items-center justify-center bg-white-50">
                        <h1 className="text-7xl font-bold text-blue-800">OptiChain</h1>
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-gray-200 h-76 "></div>

                    {/* Right side: Form */}
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="w-full max-w-md">

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                            <label className="block text-gray-700 mb-1" >Email:</label>
                            <input
                                type="email"
                                htmlFor="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                ref={emailRef}
                                required
                                className="w-full  px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            />
                            </div>

                            <div>
                            <label className="block text-gray-700 mb-1"  >Password:</label>
                            <input
                                type="password"
                                htmlFor="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4  py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            />
                            </div>

                            <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-2 px-4 mt-5 -mb-5 rounded-lg text-white font-semibold ${
                                loading ? "bg-blue-300" : "bg-blue-600 hover:cursor-pointer hover:bg-blue-700"
                            }`}
                            >
                            {loading ? "Logging in..." : "Login"}
                            </button>

                            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
                        </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Login;
