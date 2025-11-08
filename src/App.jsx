import React from 'react';
import { useMessManager } from './hooks/useMessManager';
import AuthPage from './components/AuthPage';
import MessChooser from './components/MessChooser';
import Dashboard from './components/Dashboard';

const App = () => {
    // Get all state, functions, and helpers from the custom hook
    const state = useMessManager();
    const { 
        loading, 
        user, 
        auth, 
        currentMessId, // <--- Key check
        setCurrentMessId, 
        userId, 
        userName, 
        createMessApi, 
        joinMessApi 
    } = state;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-xl font-semibold text-indigo-600">Loading App...</div>
            </div>
        );
    }
    
    // 1. Not Logged In
    if (!user) {
        return <AuthPage auth={auth} />;
    }

    // 2. Logged In AND Mess ID Exists (Go straight to Dashboard)
    // The currentMessId is initialized from localStorage in useMessManager.js, 
    // ensuring persistence across reloads.
    if (currentMessId) {
        return <Dashboard state={state} />;
    }
    
    // 3. Logged In, but no Mess Selected (Show Mess Chooser)
    // This is the fallback if user is logged in but currentMessId is null/empty.
    return (
        <MessChooser 
            userId={userId} 
            userName={userName} 
            setCurrentMessId={setCurrentMessId} 
            createMessApi={createMessApi}
            joinMessApi={joinMessApi}     
        />
    );
};

export default App;