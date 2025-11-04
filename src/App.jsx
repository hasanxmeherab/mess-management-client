import React from 'react';
import { useMessManager } from './hooks/useMessManager';
import AuthPage from './components/AuthPage';
import MessChooser from './components/MessChooser';
import Dashboard from './components/Dashboard';

const App = () => {
    // Get all state, functions, and helpers from the custom hook
    const state = useMessManager();
    const { loading, user, auth, db, currentMessId, setCurrentMessId, userId, userName, getMessRef, getMessMappingRef } = state;

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

    // 2. Logged In, but no Mess Selected
    if (!currentMessId || !db) {
        return (
            <MessChooser 
                db={db} 
                userId={userId} 
                userName={userName} 
                setCurrentMessId={setCurrentMessId} 
                getMessRef={getMessRef} 
                getMessMappingRef={getMessMappingRef} 
            />
        );
    }

    // 3. Logged In and Mess Selected
    return <Dashboard state={state} />;
};

export default App;
