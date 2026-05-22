import { LogOutIcon,Menu, User } from "lucide-react";

export function Header({
  activeSection,
  dropDown,
  open,
  setOpen,
  setActiveSection,
  userName = "Admin User",
  userEmail = "admin@portal.com",
}) {
  const isHome = String(activeSection).toLowerCase() === "home";

  const handleMenuToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleSectionSelect = (section) => {
    setActiveSection(section);
    setOpen(false);
  };


  return (
    <div className="w-full z-50 flex items-center justify-between relative mt-3 mb-5 max-w-[1400px]">

      {/* Right Dot (appears when not home) */}
      <div
        onClick={handleMenuToggle}
        className={`
          sticky top-3 left-0 mr-2
          shadow-[0_10px_20px_rgba(0,0,0,0.07)]
          rounded-full
          transition-all duration-300 ease-in-out
          cursor-pointer
          hover:shadow-[0_12px_25px_rgba(0,0,0,0.25)]
          ${isHome ? "w-0 opacity-0" : "w-16 h-16 opacity-100"}
        `}
      >
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
          <Menu className="w-6 h-6 text-gray-700" />
        </div>

        {/* Floating Dropdown */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`
            absolute  top-21
            w-48 bg-white rounded-2xl
            shadow-[0_12px_25px_rgba(0,0,0,0.1)]
            overflow-hidden
            transition-all duration-300 ease-in-out
            ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}
          `}
        >
          {dropDown.map((item, index) => (
            <div
              key={index}
              onClick={() => handleSectionSelect(item)}
              className="px-5 py-3 text-gray-700 hover:bg-gray-100 cursor-pointer transition border-b border-gray-200 "
            >
              {item}
            </div>
          ))}
        </div>

      </div>


        {/* Header */}
        <header
        className={`
            w-full bg-white h-16 flex items-center justify-between px-8 rounded-full
            shadow-[0_10px_20px_rgba(0,0,0,0.07)]
            transform transition-all duration-400 ease-in-out
            ${isHome ? "ml-0 max-w-[1400px]" : "ml-2 max-w-[1320px]"}
        `}
        >
        {/* Left Title */}
        <div
          className={`text-4xl -mt-1 font-bold text-blue-800 transition-all duration-300 `}
        >
          OptiChain
        </div>

        {/* Right Content */}
        <div className="flex items-center gap-6">
          <LogOutIcon className="text-red-600" />

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {userName}
              </p>
              <p className="text-xs text-gray-500">
                {userEmail}
              </p>
            </div>

            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default Header;