import { LogOutIcon, User } from 'lucide-react';

export function saveHeader({ activeSection }) {
  return (
    <header className="w-full max-w-[1400px] mx-auto bg-white border-b my-5 border-gray-300 h-16 flex items-center justify-between px-8 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.07)]">
        <div className="text-4xl -mt-1 font-bold text-blue-800">OptiChain</div>
        <div className="flex justify-center gap-6 w-full max-w-2xl ml-8">
            {/* Search Bar */}
            <div className="flex flex-1 items-center justify-end">
                <LogOutIcon className='text-red-600'/>
            </div>
    
            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* User Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Admin User</p>
                        <p className="text-xs text-gray-500">admin@portal.com</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>
        </div>
    </header>
  );
}
export default saveHeader;