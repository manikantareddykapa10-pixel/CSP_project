import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {Navigate} from 'react-router-dom'
import { getCurrentUser } from '../../redux/features/auth/authActions';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const [checkingUser, setCheckingUser] = useState(!user && !!localStorage.getItem('token'));

    useEffect(() => {
        if (user || !localStorage.getItem('token')) {
            setCheckingUser(false);
            return;
        };

        let mounted = true;
        dispatch(getCurrentUser()).finally(() => {
            if (mounted) setCheckingUser(false);
        });
        return () => { mounted = false; };
    }, [dispatch, user]);

    if (!localStorage.getItem('token')) {
        return <Navigate to='/login' replace />;
    }
    if (checkingUser) {
        return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
            <div className="spinner-border text-danger" role="status"><span className="visually-hidden">Loading...</span></div>
        </div>;
    }
    if (!user) {
        return <Navigate to='/login' replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const roleHome = {
            admin: '/admin',
            hospital: '/hospital',
            organisation: '/',
            donar: '/donar'
        };
        return <Navigate to={roleHome[user.role] || '/login'} replace />;
    }
    return children;
}

export default ProtectedRoute