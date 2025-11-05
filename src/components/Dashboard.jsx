import React, { useState, useMemo } from 'react';
// MODIFIED: Import necessary helpers from the new utils file
import { 
    copyToClipboard, 
    formatDate, 
    getStartOfMonth 
} from '../utils/dateHelpers'; 

// --- Shared UI components ---

/** Renders the user's name and a Sign Out button. */
const UserDropdown = ({ userName, auth, signOutFn, isAdmin, setCurrentMessId }) => (
    <div className="flex items-center space-x-2 bg-indigo-50 p-2 rounded-full pr-3 text-sm text-gray-700 shadow-inner">
        <span className="font-semibold text-indigo-700">{userName} {isAdmin && <span className="text-red-500 font-extrabold">(MANAGER)</span>}</span>
        <button
            onClick={() => signOutFn(auth).then(() => setCurrentMessId(null)).catch(console.error)}
            className="px-3 py-1 bg-white text-indigo-600 font-medium rounded-full hover:bg-gray-100 transition shadow"
        >
            Sign Out
        </button>
    </div>
);

/** Displays Mess ID and Join Key (Manager Only). */
const MessInfoDisplay = ({ currentMessId, currentJoinKey, setCopyMessage }) => {
    const [copyIdStatus, setCopyIdStatus] = useState('');
    const [copyKeyStatus, setCopyKeyStatus] = useState('');

    const handleCopy = (text, setStatus) => {
        copyToClipboard(text, setStatus);
        setCopyMessage(`Copied ${text.length > 8 ? 'ID' : 'Key'}!`);
    };

    return (
        <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="text-sm font-bold text-indigo-700 mb-2">Share Mess Details (Manager Only)</h3>
            <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between bg-white p-2 rounded-md shadow-inner border border-indigo-100">
                    <span className="font-semibold text-gray-600">ID: <code className="text-indigo-800 font-extrabold">{currentMessId}</code></span>
                    <button
                        onClick={() => handleCopy(currentMessId, setCopyIdStatus)}
                        className="ml-2 px-3 py-1 text-xs bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition"
                    >
                        {copyIdStatus || 'Copy ID'}
                    </button>
                </div>
                <div className="flex items-center justify-between bg-white p-2 rounded-md shadow-inner border border-indigo-100">
                    <span className="font-semibold text-gray-600">Key: <code className="text-red-500 font-extrabold">{currentJoinKey}</code></span>
                    <button
                        onClick={() => handleCopy(currentJoinKey, setCopyKeyStatus)}
                        className="ml-2 px-3 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                        {copyKeyStatus || 'Copy Key'}
                    </button>
                </div>
            </div>
        </div>
    );
};


/** Modal for adding new expenses (Admin only). */
const ExpenseModal = ({ expenseModalOpen, setExpenseModalOpen, addExpense }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = () => {
        if (description.trim() && parseFloat(amount) > 0) {
            addExpense(description, amount);
            setDescription('');
            setAmount('');
        }
    };

    if (!expenseModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Expense</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Description (e.g., Groceries, Chicken)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                        type="number"
                        placeholder="Amount (in local currency)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="flex justify-end space-x-3">
                        <button onClick={() => setExpenseModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition">Cancel</button>
                        <button onClick={handleSubmit} disabled={!description.trim() || !parseFloat(amount)} className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition disabled:opacity-50">Add Expense</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Modal for adding deposits (Admin only). */
const DepositModal = ({ depositModalOpen, setDepositModalOpen, addDeposit, messData, userId }) => {
    const [targetUser, setTargetUser] = useState(userId);
    const [amount, setAmount] = useState('');

    const members = Object.keys(messData?.members || {}).map(uid => ({
        uid,
        name: messData.members[uid]?.name || `User ${uid.substring(0, 4)}`,
    }));

    const handleSubmit = () => {
        if (targetUser && parseFloat(amount) > 0) {
            addDeposit(targetUser, amount);
            setAmount('');
        }
    };

    if (!depositModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Add Deposit</h3>
                <div className="space-y-4">
                    <select
                        value={targetUser}
                        onChange={(e) => setTargetUser(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {members.map(member => (
                            <option key={member.uid} value={member.uid}>{member.name}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Deposit Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="flex justify-end space-x-3">
                        <button onClick={() => setDepositModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition">Cancel</button>
                        <button onClick={handleSubmit} disabled={!targetUser || !parseFloat(amount)} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition disabled:opacity-50">Add Deposit</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// MODIFIED: Renamed and updated for MONTHLY view
const MealEntryTable = ({ messData, userId, isAdmin, currentMonthStart, setCurrentMonthStart, updateMealCount }) => {
    
    // NEW: Calculate all days in the current month
    const daysInMonth = useMemo(() => {
        const days = [];
        const current = new Date(currentMonthStart);
        // Date trick: Setting day 0 of the next month gives you the last day of the current month
        const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate(); 
        
        for (let i = 1; i <= lastDay; i++) {
            const date = new Date(current.getFullYear(), current.getMonth(), i);
            days.push(date);
        }
        return days;
    }, [currentMonthStart]);
    
    const allMembers = messData?.members || {};

    const membersToDisplay = Object.keys(allMembers).sort((a, b) => {
        const nameA = allMembers[a]?.name || '';
        const nameB = allMembers[b]?.name || '';
        return nameA.localeCompare(nameB);
    });
    
    const currentDateStr = formatDate(new Date());
    const MEAL_TYPES = ['B', 'L', 'D'];

    // --- ADDED: Color Cycle for alternating day columns ---
    const COLOR_CYCLE = [
        'bg-teal-100', // for Mon
        'bg-teal-50',  // for Tue
    ];
    
    const navigateMonth = (offset) => {
        const newDate = new Date(currentMonthStart);
        newDate.setMonth(newDate.getMonth() + offset);
        // Important: Use getStartOfMonth to reset the date to the first day 
        setCurrentMonthStart(getStartOfMonth(newDate)); 
    };
    
    // Header for the Month
    const monthHeader = currentMonthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    if (membersToDisplay.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg mt-6 text-center text-gray-500">
                No members found in this mess. Start by creating an expense or deposit if you are the manager.
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-lg mt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex justify-between items-center">
                Monthly Meal Register: {monthHeader} {isAdmin ? '' : <span className="text-sm text-gray-500 font-normal">(View Only)</span>}
                <div className="flex space-x-2">
                    <button onClick={() => navigateMonth(-1)} className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setCurrentMonthStart(getStartOfMonth(new Date()))} className="px-4 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300 transition">This Month</button>
                    <button onClick={() => navigateMonth(1)} className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-20">
                        <tr>
                            <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-30 min-w-[120px] border-r border-gray-300">Member</th>
                            {/* UPDATED: Iterate through all days in the month */}
                            {daysInMonth.map((date, i) => {
                                const dateStr = formatDate(date);
                                const isToday = dateStr === currentDateStr;
                                const colorIndex = date.getDay() % 2; // 0=Sun, 1=Mon, etc. (using simple alternating color for now)
                                
                                return (
                                    <th key={dateStr} colSpan={3}
                                        className={`text-center py-3 text-xs font-medium uppercase tracking-wider 
                                            ${COLOR_CYCLE[i % 2]} 
                                            ${isToday ? 'bg-indigo-200 text-indigo-800 font-extrabold' : ''}
                                            border-r border-gray-300`}>
                                        <div className='flex flex-col items-center justify-center'>
                                            <span className="font-extrabold text-sm">{date.getDate()}</span>
                                            <span className="font-normal text-xs text-gray-600">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                        <tr>
                            <th className="sticky left-0 bg-gray-50 border-r border-gray-300 z-30"></th>
                            {/* UPDATED: B, L, D headers for all days */}
                            {daysInMonth.map((date, i) =>
                                MEAL_TYPES.map((type, index) => (
                                    <th key={`${formatDate(date)}_${type}`}
                                        className={`px-1 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-center
                                            ${COLOR_CYCLE[i % 2]}
                                            ${(index === 2) ? 'border-r border-gray-300' : ''} 
                                        `}>
                                        {type}
                                    </th>
                                ))
                            ).flat()}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {membersToDisplay.map(memberKey => {
                            const member = allMembers[memberKey];
                            
                            if (!member) return null;

                            const isCurrentUser = memberKey === userId;
                            const canEdit = isAdmin; 
                            return (
                                <tr key={memberKey} className={isCurrentUser ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-50'}>
                                    <td className="sticky left-0 bg-inherit px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 z-10">
                                        {member.name} {isCurrentUser && <span className="text-indigo-500 text-xs">(You)</span>}
                                    </td>
                                    {/* UPDATED: Data cells for all days */}
                                    {daysInMonth.map((date, i) =>
                                        MEAL_TYPES.map(type => {
                                            const dateKey = `${formatDate(date)}_${type}`;
                                            const count = member.meals?.[dateKey] || 0;

                                            return (
                                                <td key={dateKey} 
                                                    className={`px-1 py-2 whitespace-nowrap text-center text-sm text-gray-700 
                                                        ${COLOR_CYCLE[i % 2]}
                                                        ${type === 'D' ? 'border-r border-gray-300' : ''} 
                                                    `}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="1"
                                                        value={count}
                                                        onChange={(e) => updateMealCount(memberKey, dateKey, e.target.value)}
                                                        disabled={!canEdit} 
                                                        className={`w-10 h-8 text-center border-2 rounded-lg transition ${canEdit ? 'border-indigo-400 focus:border-indigo-600' : 'border-gray-300 focus:border-gray-500 bg-gray-100 cursor-not-allowed'}`}
                                                    />
                                                </td>
                                            );
                                        })
                                    ).flat()}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


/** Main Component */
const Dashboard = ({ 
    state
}) => {
    
    const { 
        auth, signOut, userId, userName, messData, isAdmin, calculatedSummary, 
        currentMessName, currentJoinKey, currentMonthStart, setCurrentMonthStart, // MODIFIED
        updateMealCount, expenseModalOpen, setExpenseModalOpen, addExpense,
        depositModalOpen, setDepositModalOpen, addDeposit, setCopyMessage,
        currentMessId,
        setCurrentMessId
    } = state;
    
    // Default the summary values to zero if calculatedSummary is undefined 
    const summary = calculatedSummary || { 
        totalExpenses: 0, 
        totalMeals: 0, 
        ratePerMeal: '0.00',
        totalDeposited: 0, 
        availableAmount: 0, 
        memberSummaries: {},
        monthlyExpenses: [] // NEW: Default for monthly expenses
    };

    // --- Main Dashboard Render ---
    return (
        <div className="min-h-screen bg-gray-100 p-4 font-sans">
            <header className="bg-white shadow-md p-4 rounded-xl mb-6">
                <div className="flex justify-between items-center flex-wrap">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-extrabold text-indigo-700">{currentMessName} 🍽️</h1>
                        <button
                            onClick={() => {
                                setCurrentMessId(null);
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-800 transition"
                        >
                            (Change Mess)
                        </button>
                    </div>
                    <UserDropdown auth={auth} signOutFn={signOut} userName={userName} isAdmin={isAdmin} setCurrentMessId={setCurrentMessId} />
                </div>
                
                {/* Mess ID and Key Display (Admin Only) */}
                {isAdmin && <MessInfoDisplay currentMessId={currentMessId} currentJoinKey={currentJoinKey} setCopyMessage={setCopyMessage} />}


                <div className="mt-4 flex flex-wrap gap-3">
                    {/* Only show these buttons to the Admin */}
                    {isAdmin && (
                        <>
                            <button onClick={() => setExpenseModalOpen(true)} className="flex-1 min-w-[150px] px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition">
                                Add Expense
                            </button>
                            <button onClick={() => setDepositModalOpen(true)} className="flex-1 min-w-[150px] px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition">
                                Add Deposit
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Global Summary Panel and Meal Entry */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Monthly Summary</h2> {/* MODIFIED TITLE */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            
                            {/* 1. Total Expenses (Monthly) */}
                            <div className="bg-red-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-gray-500">Monthly Expenses</p> {/* MODIFIED LABEL */}
                                <p className="text-xl font-bold text-red-700">Tk {summary.totalExpenses.toFixed(2)}</p>
                            </div>
                            
                            {/* 2. Total Meals (Monthly) */}
                            <div className="bg-indigo-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-gray-500">Monthly Meals</p> {/* MODIFIED LABEL */}
                                <p className="text-xl font-bold text-indigo-700">{summary.totalMeals}</p>
                            </div>
                            
                            {/* 3. Total Deposits (Cumulative) */}
                            <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-gray-500">Total Deposits (Cumulative)</p> {/* CLARIFIED LABEL */}
                                <p className="text-xl font-bold text-green-700">Tk {summary.totalDeposited.toFixed(2)}</p>
                            </div>
                            
                            {/* 4. Available Amount (Cumulative Deposit - Monthly Expenses) */}
                            <div className={`p-3 rounded-lg ${summary.availableAmount >= 0 ? 'bg-blue-100' : 'bg-red-200'}`}>
                                <p className="text-xs font-medium text-gray-500">Available Balance</p>
                                <p className={`text-xl font-bold ${summary.availableAmount >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                                    Tk {summary.availableAmount.toFixed(2)}
                                </p>
                            </div>
                            
                            {/* 5. Rate Per Meal (Monthly) */}
                            <div className="bg-indigo-100 p-3 rounded-lg col-span-full md:col-span-2 md:col-start-2">
                                <p className="text-xs font-medium text-gray-500">Rate Per Meal (Monthly)</p>
                                <p className="text-2xl font-extrabold text-indigo-800">Tk {summary.ratePerMeal}</p>
                            </div>
                        </div>
                    </div>
                    {/* Meal Entry Table */}
                    <MealEntryTable 
                        messData={messData} 
                        userId={userId} 
                        isAdmin={isAdmin} 
                        currentMonthStart={currentMonthStart} // MODIFIED PROP
                        setCurrentMonthStart={setCurrentMonthStart} // MODIFIED PROP
                        updateMealCount={updateMealCount} 
                    />
                </div>

                {/* Member Balance & Expense History Panel */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Member Balances */}
                    <div className="bg-white p-5 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Member Balances</h2>
                        <ul className="space-y-3">
                            {Object.entries(summary.memberSummaries).map(([name, memberSummary]) => {
                                // Positive balance means user OWES (Expense Share > Cumulative Deposit)
                                const isPositive = memberSummary.balance > 0; 
                                const balanceColor = isPositive ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50';

                                return (
                                    <li key={name} className="flex justify-between items-center p-3 rounded-lg border border-gray-100">
                                        <div className="text-sm font-medium text-gray-900">{name}</div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Deposit: Tk {memberSummary.deposit.toFixed(2)}</p>
                                            <p className={`text-lg font-bold ${balanceColor} px-2 rounded-full`}>
                                                {isPositive ? '+' : ''}Tk {Math.abs(memberSummary.balance).toFixed(2)}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Expense History (Monthly Filtered) */}
                    <div className="bg-white p-5 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Expense History (This Month)</h2> {/* MODIFIED TITLE */}
                        <div className="max-h-96 overflow-y-auto space-y-3">
                            {/* NEW: Use the filtered monthlyExpenses from the summary */}
                            {summary.monthlyExpenses.slice().sort((a, b) => b.date - a.date).map(expense => (
                                <div key={expense.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-medium text-gray-900">{expense.description}</span>
                                        <span className="text-lg font-bold text-indigo-600">Tk {expense.amount.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(expense.date).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ExpenseModal 
                expenseModalOpen={expenseModalOpen} 
                setExpenseModalOpen={setExpenseModalOpen} 
                addExpense={addExpense} 
            />
            <DepositModal 
                depositModalOpen={depositModalOpen} 
                setDepositModalOpen={setDepositModalOpen} 
                addDeposit={addDeposit}
                messData={messData}
                userId={userId}
            />

        </div>
    );
};

export default Dashboard;